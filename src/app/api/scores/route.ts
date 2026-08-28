import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { matchdayScores, players } from "../../../db/schema";
import { computeFantavoto } from "../../../lib/fantavoto";
import { createScoreSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const matchdayNumber = searchParams.get("matchdayNumber");
  const rosterId = searchParams.get("rosterId");

  const conditions = [
    ...(seasonId ? [eq(matchdayScores.seasonId, seasonId)] : []),
    ...(matchdayNumber ? [eq(matchdayScores.matchdayNumber, Number(matchdayNumber))] : []),
    ...(rosterId ? [eq(matchdayScores.rosterId, rosterId)] : []),
  ];

  const rows = await db
    .select({
      id: matchdayScores.id,
      seasonId: matchdayScores.seasonId,
      fixtureId: matchdayScores.fixtureId,
      rosterId: matchdayScores.rosterId,
      playerId: matchdayScores.playerId,
      matchdayNumber: matchdayScores.matchdayNumber,
      vote: matchdayScores.vote,
      score: matchdayScores.score,
      goals: matchdayScores.goals,
      assists: matchdayScores.assists,
      penaltiesScored: matchdayScores.penaltiesScored,
      penaltiesMissed: matchdayScores.penaltiesMissed,
      penaltiesSaved: matchdayScores.penaltiesSaved,
      cleanSheet: matchdayScores.cleanSheet,
      goalsConceded: matchdayScores.goalsConceded,
      ownGoals: matchdayScores.ownGoals,
      yellowCards: matchdayScores.yellowCards,
      redCards: matchdayScores.redCards,
      fullName: players.fullName,
      position: players.position,
    })
    .from(matchdayScores)
    .innerJoin(players, eq(matchdayScores.playerId, players.id))
    .where(conditions.length ? and(...conditions) : undefined);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createScoreSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const playerRows = await db.select().from(players).where(eq(players.id, body.playerId));
  const player = playerRows[0];
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const score = computeFantavoto(player.position, body);

  const inserted = await db
    .insert(matchdayScores)
    .values({
      seasonId: body.seasonId,
      fixtureId: body.fixtureId ?? null,
      rosterId: body.rosterId ?? null,
      playerId: body.playerId,
      matchdayNumber: body.matchdayNumber,
      vote: body.vote ?? null,
      score: score.toString(),
      goals: body.goals ?? null,
      assists: body.assists ?? null,
      penaltiesScored: body.penaltiesScored ?? null,
      penaltiesMissed: body.penaltiesMissed ?? null,
      penaltiesSaved: body.penaltiesSaved ?? null,
      cleanSheet: body.cleanSheet ?? null,
      goalsConceded: body.goalsConceded ?? null,
      ownGoals: body.ownGoals ?? null,
      yellowCards: body.yellowCards ?? null,
      redCards: body.redCards ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
