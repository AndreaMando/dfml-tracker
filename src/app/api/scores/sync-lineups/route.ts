import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../../db";
import {
  lineupPlayers,
  matchdayFixtures,
  matchdayLineups,
  matchdayScores,
  participants,
  players,
  rosters,
  seasons,
} from "../../../../db/schema";
import {
  fetchLegheCalendar,
  fetchLegheParticipants,
  fetchLegheTeamLineup,
  type LegheLineupPlayer,
} from "../../../../lib/leghe-fantacalcio-client";
import { syncLineupsSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

// fantacalcio.it encodes "senza voto" (not yet played) as a sentinel value
// well outside any real vote range — same convention already handled in
// src/lib/fantacalcio-scraper.ts.
function isRealVote(v: number | null): v is number {
  return v !== null && v <= 15;
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, syncLineupsSchema);
  if ("response" in parsed) return parsed.response;
  const { seasonId, matchdayNumber, competition } = parsed.data;

  const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));
  const competitionId = competition === "cup" ? season?.cupCompetitionId : season?.leagueCompetitionId;
  const fieldLabel = competition === "cup" ? "Coppa" : "Campionato";
  if (!competitionId) {
    return NextResponse.json(
      { error: `ID competizione ${fieldLabel} non configurato per questa stagione` },
      { status: 500 }
    );
  }

  let calendar;
  let legheParticipants;
  try {
    [calendar, legheParticipants] = await Promise.all([
      fetchLegheCalendar(competitionId),
      fetchLegheParticipants(),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync formazioni fallito" },
      { status: 502 }
    );
  }

  const roundInfo = calendar.find((md) => md.matchDay === matchdayNumber);
  const championshipMatchDay = roundInfo?.championshipMatchDay ?? matchdayNumber;

  // Match on name (case-insensitive) — unlike the older /league/teams
  // endpoint used by sync-results, this participants list is spelled the
  // same way as participants.teamName (typos included), no alias table
  // needed.
  const ourRosterRows = await db
    .select({ rosterId: rosters.id, teamName: participants.teamName, displayName: participants.displayName })
    .from(rosters)
    .innerJoin(participants, eq(participants.id, rosters.participantId))
    .where(eq(rosters.seasonId, seasonId));
  const rosterByName = new Map(
    ourRosterRows.map((r) => [(r.teamName || r.displayName).trim().toLowerCase(), r.rosterId])
  );
  const rosterIdByExternalTeamId = new Map<number, string>();
  for (const p of legheParticipants) {
    const rosterId = rosterByName.get(p.teamName.trim().toLowerCase());
    if (rosterId) rosterIdByExternalTeamId.set(p.teamId, rosterId);
  }
  const externalTeamIdByRosterId = new Map(
    [...rosterIdByExternalTeamId.entries()].map(([tid, rosterId]) => [rosterId, tid])
  );

  const fixtures = await db
    .select()
    .from(matchdayFixtures)
    .where(
      and(
        eq(matchdayFixtures.seasonId, seasonId),
        eq(matchdayFixtures.matchdayNumber, matchdayNumber),
        eq(matchdayFixtures.competition, competition)
      )
    );

  let lineupsUpdated = 0;
  let playersScored = 0;
  let unmatchedPlayers = 0;
  const notMatched: string[] = [];

  for (const fixture of fixtures) {
    const tIdHome = fixture.rosterIdHome ? externalTeamIdByRosterId.get(fixture.rosterIdHome) : undefined;
    const tIdAway = fixture.rosterIdAway ? externalTeamIdByRosterId.get(fixture.rosterIdAway) : undefined;
    if (!tIdHome || !tIdAway || !fixture.rosterIdHome || !fixture.rosterIdAway) {
      notMatched.push(`Giornata ${matchdayNumber}: fixture ${fixture.id} senza squadre mappate`);
      continue;
    }

    let lineup;
    try {
      lineup = await fetchLegheTeamLineup(competitionId, matchdayNumber, championshipMatchDay, tIdHome, tIdAway);
    } catch (err) {
      notMatched.push(`Giornata ${matchdayNumber}: ${err instanceof Error ? err.message : "errore formazioni"}`);
      continue;
    }

    for (const [rosterId, side] of [
      [fixture.rosterIdHome, lineup.home] as const,
      [fixture.rosterIdAway, lineup.away] as const,
    ]) {
      const [lineupRow] = await db
        .insert(matchdayLineups)
        .values({
          seasonId,
          rosterId,
          matchdayNumber,
          competition,
          formation: side.mdl,
          submittedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [matchdayLineups.rosterId, matchdayLineups.matchdayNumber, matchdayLineups.competition],
          set: { formation: side.mdl, submittedAt: new Date() },
        })
        .returning();
      lineupsUpdated += 1;

      // Lineup composition can change entirely between syncs (late swap
      // before the deadline) — replace rather than diff/merge.
      await db.delete(lineupPlayers).where(eq(lineupPlayers.lineupId, lineupRow.id));

      const entries: { role: "starter" | "bench"; entry: LegheLineupPlayer }[] = [
        ...side.starts.map((entry) => ({ role: "starter" as const, entry })),
        ...side.bench.map((entry) => ({ role: "bench" as const, entry })),
      ];

      const externalIds = entries.map((e) => String(e.entry.pid));
      const playerRows = externalIds.length
        ? await db.select().from(players).where(inArray(players.externalId, externalIds))
        : [];
      const playerByExternalId = new Map(playerRows.filter((p) => p.externalId).map((p) => [p.externalId as string, p]));

      const lineupPlayerValues = [];
      const scoreValues = [];
      for (const { role, entry } of entries) {
        const player = playerByExternalId.get(String(entry.pid));
        if (!player) {
          // Unlike the voti scraper, this endpoint doesn't include a player
          // name — nothing to create a meaningful stub with. Skip and count;
          // should be rare once the listone is fully synced.
          unmatchedPlayers += 1;
          continue;
        }
        // scr sentinel 55 = came on briefly, no press vote ("s.v."); 56 =
        // zero minutes (benched all match, or match not played yet) — kept
        // distinct so the UI can show "s.v." only for the former.
        const playedNoVote = entry.scr === 55;
        lineupPlayerValues.push({ lineupId: lineupRow.id, playerId: player.id, role, positionIndex: null, playedNoVote });

        const vote = isRealVote(entry.scr) ? entry.scr : null;
        const score = isRealVote(entry.scr) && entry.cscr !== null ? entry.cscr : null;
        scoreValues.push({
          seasonId,
          fixtureId: fixture.id,
          rosterId,
          playerId: player.id,
          // The real Serie A round this vote belongs to — for the cup this
          // differs from `matchdayNumber` (the cup's own round number), and
          // is what matchdayScores is keyed on so league and cup share the
          // same underlying vote data for that real matchday.
          matchdayNumber: championshipMatchDay,
          vote: vote !== null ? vote.toString() : null,
          score: score !== null ? score.toString() : null,
        });
      }

      if (lineupPlayerValues.length > 0) {
        await db.insert(lineupPlayers).values(lineupPlayerValues);
      }
      if (scoreValues.length > 0) {
        await db
          .insert(matchdayScores)
          .values(scoreValues)
          .onConflictDoUpdate({
            target: [matchdayScores.seasonId, matchdayScores.playerId, matchdayScores.matchdayNumber],
            set: {
              fixtureId: sql`excluded.fixture_id`,
              rosterId: sql`excluded.roster_id`,
              vote: sql`excluded.vote`,
              score: sql`excluded.score`,
            },
          });
        playersScored += scoreValues.length;
      }
    }
  }

  return NextResponse.json({ lineupsUpdated, playersScored, unmatchedPlayers, notMatched });
}
