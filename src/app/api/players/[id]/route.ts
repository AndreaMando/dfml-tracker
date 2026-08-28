import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { participants, players, rosterPlayers, rosters } from "../../../../db/schema";
import { updatePlayerSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await db
    .select({
      id: players.id,
      externalId: players.externalId,
      fullName: players.fullName,
      position: players.position,
      teamName: players.teamName,
      birthYear: players.birthYear,
      isUnder21: players.isUnder21,
      currentValue: players.currentValue,
      initialValue: players.initialValue,
      fvm: players.fvm,
      status: players.status,
      imageUrl: players.imageUrl,
      createdAt: players.createdAt,
      ownerRosterId: rosters.id,
      ownerRosterName: rosters.name,
      ownerParticipantName: participants.displayName,
    })
    .from(players)
    .leftJoin(rosterPlayers, eq(rosterPlayers.playerId, players.id))
    .leftJoin(rosters, eq(rosters.id, rosterPlayers.rosterId))
    .leftJoin(participants, eq(participants.id, rosters.participantId))
    .where(eq(players.id, id));
  if (!rows[0]) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updatePlayerSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const updated = await db
    .update(players)
    .set({
      ...(body.fullName !== undefined && { fullName: body.fullName }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.teamName !== undefined && { teamName: body.teamName }),
      ...(body.birthYear !== undefined && { birthYear: body.birthYear }),
      ...(body.isUnder21 !== undefined && { isUnder21: body.isUnder21 }),
      ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
      ...(body.initialValue !== undefined && { initialValue: body.initialValue }),
      ...(body.fvm !== undefined && { fvm: body.fvm }),
      ...(body.status !== undefined && { status: body.status }),
    })
    .where(eq(players.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(players).where(eq(players.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
