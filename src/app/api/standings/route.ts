import { NextResponse } from "next/server";
import { db } from "../../../db";
import { standings } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(standings);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(standings)
    .values({
      seasonId: body.seasonId,
      rosterId: body.rosterId,
      played: body.played ?? 0,
      won: body.won ?? 0,
      drawn: body.drawn ?? 0,
      lost: body.lost ?? 0,
      points: body.points ?? 0,
      totalScore: body.totalScore ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
