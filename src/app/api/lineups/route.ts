import { NextResponse } from "next/server";
import { db } from "../../../db";
import { matchdayLineups, lineupPlayers } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(matchdayLineups);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const insertedLineup = await db
    .insert(matchdayLineups)
    .values({
      seasonId: body.seasonId,
      rosterId: body.rosterId,
      matchdayNumber: Number(body.matchdayNumber),
      formation: body.formation ?? null,
      submittedAt: body.submittedAt ? new Date(body.submittedAt) : null,
    })
    .returning();

  const lineupId = insertedLineup[0]?.id;

  if (lineupId && Array.isArray(body.players)) {
    await db.insert(lineupPlayers).values(
      body.players.map((player: any) => ({
        lineupId,
        playerId: player.playerId,
        role: player.role,
        positionIndex: player.positionIndex ?? null,
      }))
    );
  }

  return NextResponse.json(insertedLineup[0]);
}
