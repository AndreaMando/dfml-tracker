import { NextResponse } from "next/server";
import { db } from "../../../db";
import { matchdayScores } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(matchdayScores);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(matchdayScores)
    .values({
      seasonId: body.seasonId,
      fixtureId: body.fixtureId ?? null,
      rosterId: body.rosterId ?? null,
      playerId: body.playerId,
      matchdayNumber: Number(body.matchdayNumber),
      score: body.score ?? null,
      goals: body.goals ?? null,
      assists: body.assists ?? null,
      penaltiesScored: body.penaltiesScored ?? null,
      penaltiesSaved: body.penaltiesSaved ?? null,
      cleanSheet: body.cleanSheet ?? null,
      goalsConceded: body.goalsConceded ?? null,
      yellowCards: body.yellowCards ?? null,
      redCards: body.redCards ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
