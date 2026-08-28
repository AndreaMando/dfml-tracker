import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { marketSessions, marketMovements } from "../../../db/schema";
import { createMarketSessionSchema, createMarketMovementSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const sessions = await db
    .select()
    .from(marketSessions)
    .where(seasonId ? eq(marketSessions.seasonId, seasonId) : undefined);
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createMarketSessionSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

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
  const parsed = await parseJsonBody(request, createMarketMovementSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;
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
