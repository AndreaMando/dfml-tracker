import { NextResponse } from "next/server";
import { db } from "../../../db";
import { marketSessions, marketMovements } from "../../../db/schema";

export async function GET() {
  const sessions = await db.select().from(marketSessions);
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = await request.json();

  const insertedSession = await db
    .insert(marketSessions)
    .values({
      seasonId: body.seasonId,
      type: body.type,
      label: body.label,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isOpen: body.isOpen ?? true,
    })
    .returning();

  return NextResponse.json(insertedSession[0]);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const insertedMovement = await db.insert(marketMovements).values({
    seasonId: body.seasonId,
    sessionId: body.sessionId ?? null,
    rosterIdFrom: body.rosterIdFrom ?? null,
    rosterIdTo: body.rosterIdTo ?? null,
    playerId: body.playerId ?? null,
    movementType: body.movementType ?? "purchase",
    amount: body.amount ?? null,
    creditDelta: body.creditDelta ?? null,
    notes: body.notes ?? null,
  }).returning();

  return NextResponse.json(insertedMovement[0]);
}
