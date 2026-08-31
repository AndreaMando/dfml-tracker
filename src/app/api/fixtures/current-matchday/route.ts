import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayFixtures, participants, rosters } from "../../../../db/schema";
import { fetchLegheCalendar, fetchLegheParticipants, fetchLegheTeamLineup } from "../../../../lib/leghe-fantacalcio-client";

// Centralizes the "what matchday are we on" logic that used to be
// duplicated in app-shell.tsx, players/page.tsx and scores/page.tsx: last
// played matchday, plus one extra check — if the next matchday's real
// fixture already has both lineups locked (11 starters each side), Serie A
// has effectively moved on even though nobody synced results yet, so treat
// that as the current matchday instead.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }

  const fixtures = await db
    .select()
    .from(matchdayFixtures)
    .where(eq(matchdayFixtures.seasonId, seasonId));

  const played = fixtures.filter((f) => f.status === "played").map((f) => f.matchdayNumber);
  const maxMatchday = fixtures.length > 0 ? Math.max(...fixtures.map((f) => f.matchdayNumber)) : 1;
  let current = played.length > 0 ? Math.max(...played) : 1;

  const next = current + 1;
  const competitionId = process.env.LEGHE_COMPETITION_ID;
  if (next <= maxMatchday && competitionId) {
    const nextFixture = fixtures.find((f) => f.matchdayNumber === next && f.rosterIdHome && f.rosterIdAway);
    if (nextFixture?.rosterIdHome && nextFixture?.rosterIdAway) {
      try {
        const ourRosterRows = await db
          .select({ rosterId: rosters.id, teamName: participants.teamName, displayName: participants.displayName })
          .from(rosters)
          .innerJoin(participants, eq(participants.id, rosters.participantId))
          .where(eq(rosters.seasonId, seasonId));
        const rosterById = new Map(ourRosterRows.map((r) => [r.rosterId, (r.teamName || r.displayName).trim().toLowerCase()]));

        const [calendar, legheParticipants] = await Promise.all([
          fetchLegheCalendar(competitionId),
          fetchLegheParticipants(),
        ]);
        const teamIdByName = new Map(legheParticipants.map((p) => [p.teamName.trim().toLowerCase(), p.teamId]));
        const tIdHome = teamIdByName.get(rosterById.get(nextFixture.rosterIdHome) ?? "");
        const tIdAway = teamIdByName.get(rosterById.get(nextFixture.rosterIdAway) ?? "");
        const roundInfo = calendar.find((md) => md.matchDay === next);
        const championshipMatchDay = roundInfo?.championshipMatchDay ?? next;

        if (tIdHome && tIdAway) {
          const lineup = await fetchLegheTeamLineup(competitionId, next, championshipMatchDay, tIdHome, tIdAway);
          if (lineup.home.starts.length >= 11 && lineup.away.starts.length >= 11) {
            current = next;
          }
        }
      } catch {
        // Best-effort signal only — fall back to the played-matchday result.
      }
    }
  }

  return NextResponse.json({ matchday: current, maxMatchday });
}
