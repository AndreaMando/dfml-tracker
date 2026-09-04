import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayFixtures, participants, rosters } from "../../../../db/schema";
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

  const competitionId = process.env.LEGHE_CUP_COMPETITION_ID;
  if (!competitionId) {
    return NextResponse.json({ error: "LEGHE_CUP_COMPETITION_ID non configurato in .env.local" }, { status: 500 });
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

  let fixturesUpserted = 0;
  const unmatchedTeams = new Set<string>();

  for (const round of calendar) {
    for (const match of round.matches) {
      const rosterIdHome = rosterIdByExternalTeamId.get(match.tIdH);
      const rosterIdAway = rosterIdByExternalTeamId.get(match.tIdA);
      if (!rosterIdHome || !rosterIdAway) {
        unmatchedTeams.add(`${match.tIdH} vs ${match.tIdA}`);
        continue;
      }

      const goals = parseResult(match.result);
      await db
        .insert(matchdayFixtures)
        .values({
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
        })
        .onConflictDoUpdate({
          target: [
            matchdayFixtures.seasonId,
            matchdayFixtures.matchdayNumber,
            matchdayFixtures.rosterIdHome,
            matchdayFixtures.rosterIdAway,
            matchdayFixtures.competition,
          ],
          set: {
            linkedMatchdayNumber: round.championshipMatchDay,
            scoreHome: round.calculated ? match.ptH.toString() : null,
            scoreAway: round.calculated ? match.ptA.toString() : null,
            goalsHome: round.calculated ? goals?.home ?? null : null,
            goalsAway: round.calculated ? goals?.away ?? null : null,
            status: round.calculated ? "played" : "scheduled",
            playedAt: round.calculated ? new Date() : null,
          },
        });
      fixturesUpserted += 1;
    }
  }

  return NextResponse.json({ fixturesUpserted, unmatchedTeams: [...unmatchedTeams] });
}
