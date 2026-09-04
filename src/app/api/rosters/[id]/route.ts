import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { participants, players, rosterPlayers, rosters } from "../../../../db/schema";
import { updateRosterSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rosterRows = await db.select().from(rosters).where(eq(rosters.id, id));
  const roster = rosterRows[0];
  if (!roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  }

  const participantRows = await db
    .select()
    .from(participants)
    .where(eq(participants.id, roster.participantId));

  const composition = await db
    .select({
      rosterPlayerId: rosterPlayers.id,
      acquisitionPrice: rosterPlayers.acquisitionPrice,
      acquisitionInitialValue: rosterPlayers.acquisitionInitialValue,
      acquiredAt: rosterPlayers.acquiredAt,
      isActive: rosterPlayers.isActive,
      playerId: players.id,
      fullName: players.fullName,
      position: players.position,
      teamName: players.teamName,
      currentValue: players.currentValue,
      fvm: players.fvm,
      priceUncertain: players.priceUncertain,
    })
    .from(rosterPlayers)
    .innerJoin(players, eq(rosterPlayers.playerId, players.id))
    .where(eq(rosterPlayers.rosterId, id));

  const participant = participantRows[0] ?? null;
  // The fantasy team name lives on the participant (teamName, set on the
  // Participants page) — that's the single source of truth everywhere it's
  // shown. rosters.name is legacy and only a last-resort fallback.
  const teamName = participant?.teamName || participant?.displayName || roster.name;

  return NextResponse.json({
    ...roster,
    name: teamName,
    participant,
    players: composition,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateRosterSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const updated = await db
    .update(rosters)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.creditsRemaining !== undefined && { creditsRemaining: body.creditsRemaining }),
    })
    .where(eq(rosters.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(rosters).where(eq(rosters.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
