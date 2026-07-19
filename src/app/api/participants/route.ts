import { NextResponse } from "next/server";
import { db } from "../../../db";
import { participants } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(participants);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(participants)
    .values({
      seasonId: body.seasonId,
      userId: body.userId,
      displayName: body.displayName,
      teamName: body.teamName ?? null,
      isActive: body.isActive ?? true,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
