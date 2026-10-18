import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayFixtures, participants, rosters, seasons } from "../../../../db/schema";
import { fetchLegheCalendar, fetchLegheParticipants, parseResult } from "../../../../lib/leghe-fantacalcio-client";
import { syncCupCalendarSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

// Unlike sync-results (which only fills in scores on fixtures the user
// already created by hand for the campionato calendar), the cup has no
// manual "Aggiungi partita" step — this route creates the fixture rows
// itself from leghe.fantacalcio.it's own cup calendar. Rounds without
// determined pairings yet (semifinals/final before the quarterfinals
// resolve) simply don't appear in the API response, so re-running this
// later picks them up automatically once they exist — no placeholder rows
// needed.
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, syncCupCalendarSchema);
  if ("response" in parsed) return parsed.response;
  const { seasonId } = parsed.data;

  const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));
  const competitionId = season?.cupCompetitionId;
  if (!competitionId) {
    return NextResponse.json(
      { error: "ID competizione Coppa non configurato per questa stagione" },
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
      { error: err instanceof Error ? err.message : "Sync calendario coppa fallito" },
      { status: 502 }
    );
  }

  // Same name-based matching already used by sync-lineups — this
  // participants list is spelled exactly like participants.teamName.
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

  const unmatchedTeams = new Set<string>();
  const syncedKeys = new Set<string>();
  const rowsToUpsert: (typeof matchdayFixtures.$inferInsert)[] = [];

  for (const round of calendar) {
    for (const match of round.matches) {
      const rosterIdHome = rosterIdByExternalTeamId.get(match.tIdH);
      const rosterIdAway = rosterIdByExternalTeamId.get(match.tIdA);
      if (!rosterIdHome || !rosterIdAway) {
        unmatchedTeams.add(`${match.tIdH} vs ${match.tIdA}`);
        continue;
      }
      syncedKeys.add(`${round.matchDay}|${rosterIdHome}|${rosterIdAway}`);

      const goals = parseResult(match.result);
      rowsToUpsert.push({
        seasonId,
        matchdayNumber: round.matchDay,
        competition: "cup",
        linkedMatchdayNumber: round.championshipMatchDay,
        rosterIdHome,
        rosterIdAway,
        scoreHome: round.calculated ? match.ptH.toString() : null,
        scoreAway: round.calculated ? match.ptA.toString() : null,
        goalsHome: round.calculated ? goals?.home ?? null : null,
        goalsAway: round.calculated ? goals?.away ?? null : null,
        status: round.calculated ? "played" : "scheduled",
        playedAt: round.calculated ? new Date() : null,
      });
    }
  }

  // One multi-row upsert instead of a round trip per match.
  if (rowsToUpsert.length > 0) {
    await db
      .insert(matchdayFixtures)
      .values(rowsToUpsert)
      .onConflictDoUpdate({
        target: [
          matchdayFixtures.seasonId,
          matchdayFixtures.matchdayNumber,
          matchdayFixtures.rosterIdHome,
          matchdayFixtures.rosterIdAway,
          matchdayFixtures.competition,
        ],
        set: {
          linkedMatchdayNumber: sql`excluded.linked_matchday_number`,
          scoreHome: sql`excluded.score_home`,
          scoreAway: sql`excluded.score_away`,
          goalsHome: sql`excluded.goals_home`,
          goalsAway: sql`excluded.goals_away`,
          status: sql`excluded.status`,
          playedAt: sql`excluded.played_at`,
        },
      });
  }
  const fixturesUpserted = rowsToUpsert.length;

  // The upsert above only ever adds rows. If the cup draw changes on
  // leghe.fantacalcio.it (redrawn pairings), the old pairings would linger
  // next to the new ones and a round would show double the matches. Drop
  // cup fixtures the API no longer returns — but only unplayed ones (no
  // scores to lose), and only when every API pairing resolved to a roster,
  // so a partial/failed mapping can never wipe valid fixtures.
  let fixturesPruned = 0;
  if (calendar.length > 0 && unmatchedTeams.size === 0) {
    const existing = await db
      .select({
        id: matchdayFixtures.id,
        matchdayNumber: matchdayFixtures.matchdayNumber,
        rosterIdHome: matchdayFixtures.rosterIdHome,
        rosterIdAway: matchdayFixtures.rosterIdAway,
        status: matchdayFixtures.status,
      })
      .from(matchdayFixtures)
      .where(and(eq(matchdayFixtures.seasonId, seasonId), eq(matchdayFixtures.competition, "cup")));
    const staleIds = existing
      .filter(
        (f) =>
          f.status === "scheduled" &&
          !syncedKeys.has(`${f.matchdayNumber}|${f.rosterIdHome}|${f.rosterIdAway}`)
      )
      .map((f) => f.id);
    if (staleIds.length > 0) {
      await db.delete(matchdayFixtures).where(inArray(matchdayFixtures.id, staleIds));
      fixturesPruned = staleIds.length;
    }
  }

  return NextResponse.json({ fixturesUpserted, fixturesPruned, unmatchedTeams: [...unmatchedTeams] });
}
