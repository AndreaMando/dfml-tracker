import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { standingsPenalties } from "../../../db/schema";
import { createStandingsPenaltySchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const rows = await db
    .select()
    .from(standingsPenalties)
    .where(seasonId ? eq(standingsPenalties.seasonId, seasonId) : undefined);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createStandingsPenaltySchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const inserted = await db
    .insert(standingsPenalties)
    .values({
      seasonId: body.seasonId,
      rosterId: body.rosterId,
      points: body.points,
      reason: body.reason ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
