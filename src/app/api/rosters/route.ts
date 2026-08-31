import { NextResponse } from "next/server";
import { eq, sql as sqlOp } from "drizzle-orm";
import { db } from "../../../db";
import { participants, rosterPlayers, rosters } from "../../../db/schema";
import { createRosterSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET() {
  const rows = await db
    .select({
      id: rosters.id,
      seasonId: rosters.seasonId,
      participantId: rosters.participantId,
      // The fantasy team name is set on the Participants page (teamName) —
      // that's the single source of truth everywhere it's displayed.
      // rosters.name is legacy and only a last-resort fallback.
      name: sqlOp<string | null>`coalesce(${participants.teamName}, ${participants.displayName}, ${rosters.name})`,
      creditsRemaining: rosters.creditsRemaining,
      createdAt: rosters.createdAt,
      participantName: participants.displayName,
      isActive: participants.isActive,
      playerCount: sqlOp<number>`count(${rosterPlayers.id})`.mapWith(Number),
    })
    .from(rosters)
    .leftJoin(participants, eq(rosters.participantId, participants.id))
    .leftJoin(
      rosterPlayers,
      eq(rosterPlayers.rosterId, rosters.id)
    )
    .groupBy(rosters.id, participants.displayName, participants.teamName, participants.isActive);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createRosterSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

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
