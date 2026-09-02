import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../../db";
import { players, rosterPlayers, rosters } from "../../../../../../db/schema";
import { updateRosterPlayerSchema } from "../../../../../../lib/schemas";
import { parseJsonBody } from "../../../../../../lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id: rosterId, playerId } = await params;
  const parsed = await parseJsonBody(request, updateRosterPlayerSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const existingRows = await db
    .select()
    .from(rosterPlayers)
    .where(and(eq(rosterPlayers.rosterId, rosterId), eq(rosterPlayers.playerId, playerId)));
  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: "Roster player not found" }, { status: 404 });
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(rosterPlayers)
      .set({
        ...(body.acquisitionPrice !== undefined && { acquisitionPrice: body.acquisitionPrice }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.notes !== undefined && { notes: body.notes }),
      })
      .where(eq(rosterPlayers.id, existing.id))
      .returning();

    if (body.acquisitionPrice !== undefined) {
      const oldPrice = Number(existing.acquisitionPrice ?? 0);
      const newPrice = Number(body.acquisitionPrice ?? 0);
      if (oldPrice !== newPrice) {
        const rosterRows = await tx.select().from(rosters).where(eq(rosters.id, rosterId));
        const roster = rosterRows[0];
        if (roster) {
          await tx
            .update(rosters)
            .set({
              creditsRemaining: (
                Number(roster.creditsRemaining ?? 0) + oldPrice - newPrice
              ).toString(),
            })
            .where(eq(rosters.id, rosterId));
        }
      }
    }

    return row;
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { id: rosterId, playerId } = await params;

  const existingRows = await db
    .select()
    .from(rosterPlayers)
    .where(and(eq(rosterPlayers.rosterId, rosterId), eq(rosterPlayers.playerId, playerId)));
  const existing = existingRows[0];
  if (!existing) {
    return NextResponse.json({ error: "Roster player not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(rosterPlayers).where(eq(rosterPlayers.id, existing.id));

    const price = Number(existing.acquisitionPrice ?? 0);
    if (price !== 0) {
      // Sale rule: paid less than the current quotation -> get back exactly
      // what was paid; paid at or above it -> capped at the current
      // quotation. Equivalent to min(price, currentValue). No quotation on
      // record (e.g. manually added player) -> full refund. Exception: a
      // player flagged priceUncertain (the asterisk on fantacalcio.it —
      // long-term injury, transfer limbo, etc.) always refunds in full, no
      // cap — league rule.
      const playerRows = await tx.select().from(players).where(eq(players.id, playerId));
      const player = playerRows[0];
      const currentValue = player?.currentValue !== undefined && player?.currentValue !== null
        ? Number(player.currentValue)
        : null;
      const refund = player?.priceUncertain
        ? price
        : currentValue !== null ? Math.min(price, currentValue) : price;

      const rosterRows = await tx.select().from(rosters).where(eq(rosters.id, rosterId));
      const roster = rosterRows[0];
      if (roster) {
        await tx
          .update(rosters)
          .set({ creditsRemaining: (Number(roster.creditsRemaining ?? 0) + refund).toString() })
          .where(eq(rosters.id, rosterId));
      }
    }
  });

  return NextResponse.json({ ok: true });
}
