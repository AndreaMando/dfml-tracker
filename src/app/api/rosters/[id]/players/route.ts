import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "../../../../../db";
import { players, rosterPlayers, rosters } from "../../../../../db/schema";
import { addRosterPlayerSchema } from "../../../../../lib/schemas";
import { parseJsonBody } from "../../../../../lib/validate";

const POSITION_CAPS: Record<string, number> = { GK: 3, DF: 8, MF: 8, FW: 6 };
const ROSTER_CAP = 25;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rosterId } = await params;
  const parsed = await parseJsonBody(request, addRosterPlayerSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const rosterRows = await db.select().from(rosters).where(eq(rosters.id, rosterId));
  const roster = rosterRows[0];
  if (!roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  }

  const playerRows = await db.select().from(players).where(eq(players.id, body.playerId));
  const player = playerRows[0];
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const existing = await db
    .select()
    .from(rosterPlayers)
    .where(and(eq(rosterPlayers.rosterId, rosterId), eq(rosterPlayers.playerId, body.playerId)));

  const price = body.acquisitionPrice ?? null;

  const row = await db.transaction(async (tx) => {
    if (existing[0]) {
      const oldPrice = Number(existing[0].acquisitionPrice ?? 0);
      const newPrice = Number(price ?? 0);
      const [updated] = await tx
        .update(rosterPlayers)
        .set({ acquisitionPrice: price, acquisitionInitialValue: player.initialValue, isActive: true })
        .where(eq(rosterPlayers.id, existing[0].id))
        .returning();
      if (oldPrice !== newPrice) {
        await tx
          .update(rosters)
          .set({
            creditsRemaining: (
              Number(roster.creditsRemaining ?? 0) + oldPrice - newPrice
            ).toString(),
          })
          .where(eq(rosters.id, rosterId));
      }
      return updated;
    }

    // New addition: enforce position cap and 25-player cap.
    const composition = await tx
      .select({ position: players.position })
      .from(rosterPlayers)
      .innerJoin(players, eq(rosterPlayers.playerId, players.id))
      .where(eq(rosterPlayers.rosterId, rosterId));

    if (composition.length >= ROSTER_CAP) {
      throw new RosterLimitError(`Rosa piena (${ROSTER_CAP}/${ROSTER_CAP})`);
    }
    const cap = POSITION_CAPS[player.position];
    const countForPosition = composition.filter((c) => c.position === player.position).length;
    if (cap !== undefined && countForPosition >= cap) {
      throw new RosterLimitError(`Limite ${cap} ${player.position} raggiunto`);
    }

    const [inserted] = await tx
      .insert(rosterPlayers)
      .values({
        rosterId,
        playerId: body.playerId,
        seasonId: roster.seasonId,
        acquiredAt: new Date(),
        acquisitionPrice: price,
        acquisitionInitialValue: player.initialValue,
        isActive: true,
      })
      .returning();

    await tx
      .update(rosters)
      .set({ creditsRemaining: (Number(roster.creditsRemaining ?? 0) - Number(price ?? 0)).toString() })
      .where(eq(rosters.id, rosterId));

    return inserted;
  }).catch((err) => {
    if (err instanceof RosterLimitError) return err;
    throw err;
  });

  if (row instanceof RosterLimitError) {
    return NextResponse.json({ error: row.message }, { status: 400 });
  }

  return NextResponse.json(row);
}

class RosterLimitError extends Error {}
