import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { players, rosterPlayers, rosters, tradePlayers, trades } from "../../../db/schema";
import { createTradeSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET() {
  const tradeRows = await db.select().from(trades).orderBy(desc(trades.createdAt));
  const rosterRows = await db.select().from(rosters);
  const rosterMap = new Map(rosterRows.map((r) => [r.id, r.name]));

  const playerRows = await db
    .select({
      tradeId: tradePlayers.tradeId,
      playerId: tradePlayers.playerId,
      fromRosterId: tradePlayers.fromRosterId,
      toRosterId: tradePlayers.toRosterId,
      fullName: players.fullName,
    })
    .from(tradePlayers)
    .innerJoin(players, eq(tradePlayers.playerId, players.id));

  const result = tradeRows.map((trade) => ({
    ...trade,
    rosterAName: rosterMap.get(trade.rosterIdA) ?? null,
    rosterBName: rosterMap.get(trade.rosterIdB) ?? null,
    players: playerRows.filter((p) => p.tradeId === trade.id),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createTradeSchema);
  if ("response" in parsed) return parsed.response;
  const {
    seasonId,
    rosterIdA,
    rosterIdB,
    playersFromA = [],
    playersFromB = [],
    creditsDeltaA,
    creditsDeltaB,
    notes,
  } = parsed.data;

  const trade = await db.transaction(async (tx) => {
    // 1-for-1 trades (the only kind that exist in practice — the actual
    // negotiation happens outside this tracker) keep the acquisition price
    // and the Q.In.-at-purchase snapshot with the fantallenatore who paid
    // it, not with the physical player: after the swap, each side's new
    // player is recorded at what that side originally paid for the player
    // they gave up.
    if (playersFromA.length === 1 && playersFromB.length === 1) {
      const [rowA] = await tx
        .select()
        .from(rosterPlayers)
        .where(and(eq(rosterPlayers.playerId, playersFromA[0]), eq(rosterPlayers.rosterId, rosterIdA)));
      const [rowB] = await tx
        .select()
        .from(rosterPlayers)
        .where(and(eq(rosterPlayers.playerId, playersFromB[0]), eq(rosterPlayers.rosterId, rosterIdB)));

      if (rowA) {
        await tx
          .update(rosterPlayers)
          .set({
            rosterId: rosterIdB,
            acquisitionPrice: rowB?.acquisitionPrice ?? null,
            acquisitionInitialValue: rowB?.acquisitionInitialValue ?? null,
          })
          .where(eq(rosterPlayers.id, rowA.id));
      }
      if (rowB) {
        await tx
          .update(rosterPlayers)
          .set({
            rosterId: rosterIdA,
            acquisitionPrice: rowA?.acquisitionPrice ?? null,
            acquisitionInitialValue: rowA?.acquisitionInitialValue ?? null,
          })
          .where(eq(rosterPlayers.id, rowB.id));
      }
    } else {
      if (playersFromA.length > 0) {
        await tx
          .update(rosterPlayers)
          .set({ rosterId: rosterIdB })
          .where(
            and(inArray(rosterPlayers.playerId, playersFromA), eq(rosterPlayers.rosterId, rosterIdA))
          );
      }
      if (playersFromB.length > 0) {
        await tx
          .update(rosterPlayers)
          .set({ rosterId: rosterIdA })
          .where(
            and(inArray(rosterPlayers.playerId, playersFromB), eq(rosterPlayers.rosterId, rosterIdB))
          );
      }
    }

    if (creditsDeltaA !== undefined && creditsDeltaA !== null && creditsDeltaA !== "") {
      const [rosterA] = await tx.select().from(rosters).where(eq(rosters.id, rosterIdA));
      if (rosterA) {
        await tx
          .update(rosters)
          .set({
            creditsRemaining: (
              Number(rosterA.creditsRemaining ?? 0) + Number(creditsDeltaA)
            ).toString(),
          })
          .where(eq(rosters.id, rosterIdA));
      }
    }
    if (creditsDeltaB !== undefined && creditsDeltaB !== null && creditsDeltaB !== "") {
      const [rosterB] = await tx.select().from(rosters).where(eq(rosters.id, rosterIdB));
      if (rosterB) {
        await tx
          .update(rosters)
          .set({
            creditsRemaining: (
              Number(rosterB.creditsRemaining ?? 0) + Number(creditsDeltaB)
            ).toString(),
          })
          .where(eq(rosters.id, rosterIdB));
      }
    }

    const [insertedTrade] = await tx
      .insert(trades)
      .values({
        seasonId,
        rosterIdA,
        rosterIdB,
        creditsDeltaA: creditsDeltaA || null,
        creditsDeltaB: creditsDeltaB || null,
        notes: notes ?? null,
      })
      .returning();

    const tradePlayerRows = [
      ...playersFromA.map((playerId: string) => ({
        tradeId: insertedTrade.id,
        playerId,
        fromRosterId: rosterIdA,
        toRosterId: rosterIdB,
      })),
      ...playersFromB.map((playerId: string) => ({
        tradeId: insertedTrade.id,
        playerId,
        fromRosterId: rosterIdB,
        toRosterId: rosterIdA,
      })),
    ];
    if (tradePlayerRows.length > 0) {
      await tx.insert(tradePlayers).values(tradePlayerRows);
    }

    return insertedTrade;
  });

  return NextResponse.json(trade);
}
