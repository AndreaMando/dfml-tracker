import { NextResponse } from "next/server";
import { db } from "../../../db";
import { players } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(players);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(players)
    .values({
      fullName: body.fullName,
      position: body.position,
      teamName: body.teamName ?? null,
      birthYear: body.birthYear ?? null,
      isUnder21: body.isUnder21 ?? false,
      currentValue: body.currentValue ?? null,
      status: body.status ?? "active",
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
