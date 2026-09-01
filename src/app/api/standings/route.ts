import { NextResponse } from "next/server";
import { db } from "../../../db";
import { standings } from "../../../db/schema";
import { computeStandings } from "../../../lib/standings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }

  const sorted = await computeStandings(seasonId);
  return NextResponse.json(sorted);
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
