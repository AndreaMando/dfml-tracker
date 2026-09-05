import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayFixtures, rosters, seasons } from "../../../../db/schema";
import {
  fetchLegheCalendar,
  fetchLegheTeams,
  normalizeLegheTeamName,
  parseResult,
} from "../../../../lib/leghe-fantacalcio-client";
import { syncFixtureResultsSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, syncFixtureResultsSchema);
  if ("response" in parsed) return parsed.response;
  const { seasonId } = parsed.data;

  const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));
  const competitionId = season?.leagueCompetitionId;
  if (!competitionId) {
    return NextResponse.json(
      { error: "ID competizione Campionato non configurato per questa stagione" },
      { status: 500 }
    );
  }

  let teams;
  let calendar;
  try {
    [teams, calendar] = await Promise.all([
      fetchLegheTeams(),
      fetchLegheCalendar(competitionId),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync fallito" },
      { status: 502 }
    );
  }

  const rosterRows = await db.select().from(rosters).where(eq(rosters.seasonId, seasonId));
  const rosterByName = new Map(rosterRows.map((r) => [r.name, r.id]));

  const externalIdToRosterId = new Map<number, string>();
  const unresolvedTeams: string[] = [];
  for (const team of teams) {
    const canonicalName = normalizeLegheTeamName(team.name);
    const rosterId = canonicalName ? rosterByName.get(canonicalName) : undefined;
    if (rosterId) externalIdToRosterId.set(team.id, rosterId);
    else unresolvedTeams.push(team.name);
  }

  let updated = 0;
  const notMatched: string[] = [];

  for (const matchday of calendar) {
    if (!matchday.calculated) continue;

    for (const match of matchday.matches) {
      const rosterIdHome = externalIdToRosterId.get(match.tIdH);
      const rosterIdAway = externalIdToRosterId.get(match.tIdA);
      const goals = parseResult(match.result);

      if (!rosterIdHome || !rosterIdAway) {
        notMatched.push(`Giornata ${matchday.matchDay}: squadra ${match.tIdH} o ${match.tIdA} non mappata`);
        continue;
      }

      const result = await db
        .update(matchdayFixtures)
        .set({
          scoreHome: match.ptH.toString(),
          scoreAway: match.ptA.toString(),
          goalsHome: goals?.home ?? null,
          goalsAway: goals?.away ?? null,
          status: "played",
          playedAt: new Date(),
        })
        .where(
          and(
            eq(matchdayFixtures.seasonId, seasonId),
            eq(matchdayFixtures.matchdayNumber, matchday.matchDay),
            eq(matchdayFixtures.rosterIdHome, rosterIdHome),
            eq(matchdayFixtures.rosterIdAway, rosterIdAway)
          )
        )
        .returning({ id: matchdayFixtures.id });

      if (result[0]) updated += 1;
      else notMatched.push(`Giornata ${matchday.matchDay}: nessuna fixture programmata per questo incontro`);
    }
  }

  return NextResponse.json({ updated, unresolvedTeams, notMatched });
}
