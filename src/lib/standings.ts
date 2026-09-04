import { eq, inArray, sql as sqlOp } from "drizzle-orm";
import { db } from "../db";
import {
  creditsBonusRules,
  matchdayFixtures,
  participants,
  rosters,
  standings,
  standingsPenalties,
} from "../db/schema";

export type StandingsRow = {
  rosterId: string;
  rosterName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  totalScore: number;
  penaltyPoints: number;
};

/**
 * Computes and caches (upserts into the `standings` table) the current
 * table for a season from its played fixtures, sorted the same way the
 * league does: points first, total fantapunti as tiebreak. Shared by
 * GET /api/standings and the cross-season roster import (which needs a
 * source season's final placement to compute the end-of-season credits
 * bonus).
 */
export async function computeStandings(seasonId: string): Promise<StandingsRow[]> {
  const seasonRosters = await db.select().from(rosters).where(eq(rosters.seasonId, seasonId));
  const table = new Map<string, Omit<StandingsRow, "rosterName" | "penaltyPoints">>();
  for (const roster of seasonRosters) {
    table.set(roster.id, {
      rosterId: roster.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      totalScore: 0,
    });
  }

  const fixtures = await db
    .select()
    .from(matchdayFixtures)
    .where(eq(matchdayFixtures.seasonId, seasonId));

  for (const fixture of fixtures) {
    if (fixture.status !== "played") continue;
    if (!fixture.rosterIdHome || !fixture.rosterIdAway) continue;
    const home = table.get(fixture.rosterIdHome);
    const away = table.get(fixture.rosterIdAway);
    if (!home || !away) continue;

    const scoreHome = Number(fixture.scoreHome ?? 0);
    const scoreAway = Number(fixture.scoreAway ?? 0);

    home.played += 1;
    away.played += 1;
    home.totalScore += scoreHome;
    away.totalScore += scoreAway;

    // The real league determines the outcome by goals (converted from
    // fantapunti via leghe.fantacalcio.it's own table), not by comparing raw
    // fantapunti directly — two different fantapunti totals can still be a
    // draw. Use goalsHome/goalsAway when available; fall back to comparing
    // fantapunti for fixtures entered manually without goals.
    const hasGoals = fixture.goalsHome !== null && fixture.goalsAway !== null;
    const homeMetric = hasGoals ? Number(fixture.goalsHome) : scoreHome;
    const awayMetric = hasGoals ? Number(fixture.goalsAway) : scoreAway;

    if (homeMetric > awayMetric) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (homeMetric < awayMetric) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  // The fantasy team name is set on the Participants page (teamName) —
  // that's the single source of truth everywhere it's displayed.
  const participantIds = seasonRosters.map((r) => r.participantId);
  const participantRows = participantIds.length
    ? await db.select().from(participants).where(inArray(participants.id, participantIds))
    : [];
  const participantById = new Map(participantRows.map((p) => [p.id, p]));
  const rosterNameMap = new Map(
    seasonRosters.map((r) => {
      const participant = participantById.get(r.participantId);
      return [r.id, participant?.teamName || participant?.displayName || r.name];
    })
  );
  // Manual standings-point deductions (e.g. a rule violation penalty) —
  // separate from financialTransactions, which only ever moves credits.
  const penaltyRows = await db
    .select({ rosterId: standingsPenalties.rosterId, total: sqlOp<number>`sum(${standingsPenalties.points})`.mapWith(Number) })
    .from(standingsPenalties)
    .where(eq(standingsPenalties.seasonId, seasonId))
    .groupBy(standingsPenalties.rosterId);
  const penaltyByRosterId = new Map(penaltyRows.map((r) => [r.rosterId, r.total]));

  const rows = Array.from(table.values()).map((row) => {
    const penaltyPoints = penaltyByRosterId.get(row.rosterId) ?? 0;
    return { ...row, points: row.points - penaltyPoints, penaltyPoints };
  });

  // Cache into standings table (upsert per season+roster).
  for (const row of rows) {
    await db
      .insert(standings)
      .values({
        seasonId,
        rosterId: row.rosterId,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        points: row.points,
        totalScore: row.totalScore.toString(),
      })
      .onConflictDoUpdate({
        target: [standings.seasonId, standings.rosterId],
        set: {
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          points: row.points,
          totalScore: row.totalScore.toString(),
          updatedAt: new Date(),
        },
      });
  }

  return rows
    .map((row) => ({ ...row, rosterName: rosterNameMap.get(row.rosterId) ?? null }))
    .sort((a, b) => b.points - a.points || b.totalScore - a.totalScore);
}

// End-of-season bonus credits by final placement — editable per season via
// the `credits_bonus_rules` table (Finance page); a season with no custom
// rows falls back to the historical tiers: 1st–3rd +50, 4th–5th +75,
// 6th–8th +100. `rank` is 1-based.
function defaultCreditsBonusForRank(rank: number): number {
  if (rank <= 3) return 50;
  if (rank <= 5) return 75;
  return 100;
}

export async function getCreditsBonusMap(seasonId: string): Promise<Map<number, number>> {
  const rows = await db
    .select({ rank: creditsBonusRules.rank, bonus: creditsBonusRules.bonus })
    .from(creditsBonusRules)
    .where(eq(creditsBonusRules.seasonId, seasonId));
  return new Map(rows.map((r) => [r.rank, Number(r.bonus)]));
}

export function creditsBonusForRank(rank: number, customBonusByRank?: Map<number, number>): number {
  return customBonusByRank?.get(rank) ?? defaultCreditsBonusForRank(rank);
}
