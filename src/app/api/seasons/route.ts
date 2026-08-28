import { NextResponse } from "next/server";
import { db } from "../../../db";
import { seasons } from "../../../db/schema";
import { createSeasonSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET() {
  const rows = await db.select().from(seasons);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createSeasonSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const inserted = await db
    .insert(seasons)
    .values({
      name: body.name,
      year: body.year,
      status: body.status ?? "draft",
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
