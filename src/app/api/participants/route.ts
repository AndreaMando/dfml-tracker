import { NextResponse } from "next/server";
import { db } from "../../../db";
import { participants } from "../../../db/schema";
import { createParticipantSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET() {
  const rows = await db.select().from(participants);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createParticipantSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

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
