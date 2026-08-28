import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayScores, players } from "../../../../db/schema";
import { computeFantavoto } from "../../../../lib/fantavoto";
import { updateScoreSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateScoreSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const existingRows = await db.select().from(matchdayScores).where(eq(matchdayScores.id, id));
  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  const playerRows = await db.select().from(players).where(eq(players.id, existing.playerId));
  const player = playerRows[0];

  const merged = {
    vote: body.vote !== undefined ? body.vote : existing.vote,
    goals: body.goals !== undefined ? body.goals : existing.goals,
    assists: body.assists !== undefined ? body.assists : existing.assists,
    yellowCards: body.yellowCards !== undefined ? body.yellowCards : existing.yellowCards,
    redCards: body.redCards !== undefined ? body.redCards : existing.redCards,
    cleanSheet: body.cleanSheet !== undefined ? body.cleanSheet : existing.cleanSheet,
    penaltiesSaved: body.penaltiesSaved !== undefined ? body.penaltiesSaved : existing.penaltiesSaved,
    penaltiesMissed: body.penaltiesMissed !== undefined ? body.penaltiesMissed : existing.penaltiesMissed,
    ownGoals: body.ownGoals !== undefined ? body.ownGoals : existing.ownGoals,
  };
  const score = player ? computeFantavoto(player.position, merged) : Number(existing.score ?? 0);

  const updated = await db
    .update(matchdayScores)
    .set({
      ...(body.vote !== undefined && { vote: body.vote }),
      ...(body.goals !== undefined && { goals: body.goals }),
      ...(body.assists !== undefined && { assists: body.assists }),
      ...(body.penaltiesScored !== undefined && { penaltiesScored: body.penaltiesScored }),
      ...(body.penaltiesMissed !== undefined && { penaltiesMissed: body.penaltiesMissed }),
      ...(body.penaltiesSaved !== undefined && { penaltiesSaved: body.penaltiesSaved }),
      ...(body.cleanSheet !== undefined && { cleanSheet: body.cleanSheet }),
      ...(body.goalsConceded !== undefined && { goalsConceded: body.goalsConceded }),
      ...(body.ownGoals !== undefined && { ownGoals: body.ownGoals }),
      ...(body.yellowCards !== undefined && { yellowCards: body.yellowCards }),
      ...(body.redCards !== undefined && { redCards: body.redCards }),
      ...(body.notes !== undefined && { notes: body.notes }),
      score: score.toString(),
    })
    .where(eq(matchdayScores.id, id))
    .returning();

  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(matchdayScores).where(eq(matchdayScores.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
