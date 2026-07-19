import { NextResponse } from "next/server";
import { db } from "../../../db";
import { rosters } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(rosters);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(rosters)
    .values({
      seasonId: body.seasonId,
      participantId: body.participantId,
      name: body.name ?? null,
      creditsRemaining: body.creditsRemaining ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
