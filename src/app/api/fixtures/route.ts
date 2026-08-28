import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { matchdayFixtures, rosters } from "../../../db/schema";
import { createFixtureSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const matchdayNumber = searchParams.get("matchdayNumber");

  const homeRosters = db.select({ id: rosters.id, name: rosters.name }).from(rosters).as("home_rosters");
  const awayRosters = db.select({ id: rosters.id, name: rosters.name }).from(rosters).as("away_rosters");

  const conditions = [
    ...(seasonId ? [eq(matchdayFixtures.seasonId, seasonId)] : []),
    ...(matchdayNumber ? [eq(matchdayFixtures.matchdayNumber, Number(matchdayNumber))] : []),
  ];

  const rows = await db
    .select({
      id: matchdayFixtures.id,
      seasonId: matchdayFixtures.seasonId,
      matchdayNumber: matchdayFixtures.matchdayNumber,
      rosterIdHome: matchdayFixtures.rosterIdHome,
      rosterIdAway: matchdayFixtures.rosterIdAway,
      scoreHome: matchdayFixtures.scoreHome,
      scoreAway: matchdayFixtures.scoreAway,
      goalsHome: matchdayFixtures.goalsHome,
      goalsAway: matchdayFixtures.goalsAway,
      status: matchdayFixtures.status,
      playedAt: matchdayFixtures.playedAt,
      homeName: homeRosters.name,
      awayName: awayRosters.name,
    })
    .from(matchdayFixtures)
    .leftJoin(homeRosters, eq(matchdayFixtures.rosterIdHome, homeRosters.id))
    .leftJoin(awayRosters, eq(matchdayFixtures.rosterIdAway, awayRosters.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(matchdayFixtures.matchdayNumber);

  return NextResponse.json(rows);
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
