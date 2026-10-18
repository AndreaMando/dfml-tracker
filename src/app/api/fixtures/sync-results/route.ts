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
import { invalidateCache } from "../../../../lib/ttl-cache";
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

  const [rosterRows, existingFixtures] = await Promise.all([
    db.select().from(rosters).where(eq(rosters.seasonId, seasonId)),
    // League fixtures only — the cup has its own sync and its own rows.
    db
      .select()
      .from(matchdayFixtures)
      .where(and(eq(matchdayFixtures.seasonId, seasonId), eq(matchdayFixtures.competition, "league"))),
  ]);
  const rosterByName = new Map(rosterRows.map((r) => [r.name, r.id]));

  const externalIdToRosterId = new Map<number, string>();
  const unresolvedTeams: string[] = [];
  for (const team of teams) {
    const canonicalName = normalizeLegheTeamName(team.name);
    const rosterId = canonicalName ? rosterByName.get(canonicalName) : undefined;
    if (rosterId) externalIdToRosterId.set(team.id, rosterId);
    else unresolvedTeams.push(team.name);
  }

  const fixtureByPairing = new Map(
    existingFixtures.map((f) => [`${f.matchdayNumber}|${f.rosterIdHome}|${f.rosterIdAway}`, f])
  );

  let updated = 0;
  const notMatched: string[] = [];
  const writes: Promise<unknown>[] = [];

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

      const fixture = fixtureByPairing.get(`${matchday.matchDay}|${rosterIdHome}|${rosterIdAway}`);
      if (!fixture) {
        notMatched.push(`Giornata ${matchday.matchDay}: nessuna fixture programmata per questo incontro`);
        continue;
      }
      updated += 1;

      // This route runs on every /scores load and the vast majority of
      // calculated matchdays haven't changed since last time — only write
      // the rows whose result actually differs.
      const scoreHome = match.ptH.toString();
      const scoreAway = match.ptA.toString();
      const goalsHome = goals?.home ?? null;
      const goalsAway = goals?.away ?? null;
      const unchanged =
        fixture.status === "played" &&
        Number(fixture.scoreHome) === Number(scoreHome) &&
        Number(fixture.scoreAway) === Number(scoreAway) &&
        fixture.goalsHome === goalsHome &&
        fixture.goalsAway === goalsAway;
      if (unchanged) continue;

      writes.push(
        db
          .update(matchdayFixtures)
          .set({
            scoreHome,
            scoreAway,
            goalsHome,
            goalsAway,
            status: "played",
            playedAt: fixture.status === "played" ? fixture.playedAt : new Date(),
          })
          .where(eq(matchdayFixtures.id, fixture.id))
      );
    }
  }

  await Promise.all(writes);
  // A matchday that just flipped to "played" moves the current matchday.
  if (writes.length > 0) invalidateCache("current-matchday:");

  return NextResponse.json({ updated, unresolvedTeams, notMatched });
}
