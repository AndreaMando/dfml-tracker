import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../../db";
import { matchdayFixtures, participants, rosters } from "../../../db/schema";
import { createFixtureSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const matchdayNumber = searchParams.get("matchdayNumber");
  const linkedMatchdayNumber = searchParams.get("linkedMatchdayNumber");
  // Every existing caller expects campionato fixtures only — default to
  // "league" so adding cup rows to this table never changes their results.
  const competition = searchParams.get("competition") ?? "league";

  const conditions = [
    ...(seasonId ? [eq(matchdayFixtures.seasonId, seasonId)] : []),
    ...(matchdayNumber ? [eq(matchdayFixtures.matchdayNumber, Number(matchdayNumber))] : []),
    ...(linkedMatchdayNumber ? [eq(matchdayFixtures.linkedMatchdayNumber, Number(linkedMatchdayNumber))] : []),
    eq(matchdayFixtures.competition, competition as "league" | "cup"),
  ];

  // The fantasy team name is set on the Participants page (teamName) —
  // that's the single source of truth everywhere it's displayed, rosters.name
  // is only a last-resort legacy fallback. One query: both sides' roster and
  // participant are LEFT JOINed (aliased) instead of three round trips.
  const homeRoster = alias(rosters, "home_roster");
  const awayRoster = alias(rosters, "away_roster");
  const homeParticipant = alias(participants, "home_participant");
  const awayParticipant = alias(participants, "away_participant");

  const rows = await db
    .select({
      fixture: matchdayFixtures,
      homeTeamName: homeParticipant.teamName,
      homeDisplayName: homeParticipant.displayName,
      homeRosterName: homeRoster.name,
      awayTeamName: awayParticipant.teamName,
      awayDisplayName: awayParticipant.displayName,
      awayRosterName: awayRoster.name,
    })
    .from(matchdayFixtures)
    .leftJoin(homeRoster, eq(homeRoster.id, matchdayFixtures.rosterIdHome))
    .leftJoin(homeParticipant, eq(homeParticipant.id, homeRoster.participantId))
    .leftJoin(awayRoster, eq(awayRoster.id, matchdayFixtures.rosterIdAway))
    .leftJoin(awayParticipant, eq(awayParticipant.id, awayRoster.participantId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(matchdayFixtures.matchdayNumber);

  const result = rows.map((r) => ({
    ...r.fixture,
    homeName: r.fixture.rosterIdHome ? r.homeTeamName || r.homeDisplayName || r.homeRosterName || null : null,
    awayName: r.fixture.rosterIdAway ? r.awayTeamName || r.awayDisplayName || r.awayRosterName || null : null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createFixtureSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const inserted = await db
    .insert(matchdayFixtures)
    .values({
      seasonId: body.seasonId,
      matchdayNumber: body.matchdayNumber,
      rosterIdHome: body.rosterIdHome ?? null,
      rosterIdAway: body.rosterIdAway ?? null,
      status: body.status ?? "scheduled",
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
