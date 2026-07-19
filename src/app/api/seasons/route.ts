import { NextResponse } from "next/server";
import { db } from "../../../db";
import { seasons } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(seasons);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(seasons)
    .values({
      name: body.name,
      year: Number(body.year),
      status: body.status ?? "draft",
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
