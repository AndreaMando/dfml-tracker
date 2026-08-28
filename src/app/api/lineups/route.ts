import { NextResponse } from "next/server";
import { db } from "../../../db";
import { matchdayLineups, lineupPlayers } from "../../../db/schema";
import { createLineupSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET() {
  const rows = await db.select().from(matchdayLineups);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createLineupSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const insertedLineup = await db
    .insert(matchdayLineups)
    .values({
      seasonId: body.seasonId,
      rosterId: body.rosterId,
      matchdayNumber: body.matchdayNumber,
      formation: body.formation ?? null,
      submittedAt: body.submittedAt ? new Date(body.submittedAt) : null,
    })
    .returning();

  const lineupId = insertedLineup[0]?.id;

  if (lineupId && body.players && body.players.length > 0) {
    await db.insert(lineupPlayers).values(
      body.players.map((player) => ({
        lineupId,
        playerId: player.playerId,
        role: player.role,
        positionIndex: player.positionIndex ?? null,
      }))
    );
  }

  return NextResponse.json(insertedLineup[0]);
}
