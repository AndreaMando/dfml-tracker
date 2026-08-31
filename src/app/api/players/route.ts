import { NextResponse } from "next/server";
import { eq, sql as sqlOp } from "drizzle-orm";
import { db } from "../../../db";
import { participants, players, rosterPlayers, rosters } from "../../../db/schema";
import { createPlayerSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET() {
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
      // The fantasy team name is set on the Participants page (teamName) —
      // that's the single source of truth everywhere it's displayed.
      ownerRosterName: sqlOp<string | null>`coalesce(${participants.teamName}, ${participants.displayName}, ${rosters.name})`,
      ownerParticipantName: participants.displayName,
    })
    .from(players)
    .leftJoin(
      rosterPlayers,
      eq(rosterPlayers.playerId, players.id)
    )
    .leftJoin(rosters, eq(rosters.id, rosterPlayers.rosterId))
    .leftJoin(participants, eq(participants.id, rosters.participantId));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createPlayerSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

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
