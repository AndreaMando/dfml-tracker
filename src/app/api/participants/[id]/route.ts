import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { participants, rosters } from "../../../../db/schema";
import { updateParticipantSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db.select().from(participants).where(eq(participants.id, id));
  if (!rows[0]) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  const rosterRows = await db.select().from(rosters).where(eq(rosters.participantId, id));
  return NextResponse.json({ ...rows[0], rosters: rosterRows });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateParticipantSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const updated = await db
    .update(participants)
    .set({
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.teamName !== undefined && { teamName: body.teamName }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    })
    .where(eq(participants.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(participants).where(eq(participants.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
