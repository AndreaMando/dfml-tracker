import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../../../db";
import { participants, players, rosterPlayers, rosters } from "../../../../../db/schema";
import { computeStandings, creditsBonusForRank } from "../../../../../lib/standings";
import { importRostersSchema } from "../../../../../lib/schemas";
import { parseJsonBody } from "../../../../../lib/validate";

// Carries rosters (and their manager/participant) over from a finished
// season into a new one — the "continuous fantacalcio" renewal flow.
// Nothing needs to be snapshotted at season-close time: rosterPlayers and
// rosters.creditsRemaining for a past season are already permanent, untouched
// rows once a newer season exists. This route just reads them and re-creates
// equivalent rows in the destination season.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetSeasonId } = await params;
  const parsed = await parseJsonBody(request, importRostersSchema);
  if ("response" in parsed) return parsed.response;
  const { sourceSeasonId, rosterIds } = parsed.data;

  const standingsTable = await computeStandings(sourceSeasonId);
  const rankByRosterId = new Map(standingsTable.map((row, index) => [row.rosterId, index + 1]));

  const sourceRosters = await db
    .select()
    .from(rosters)
    .where(and(eq(rosters.seasonId, sourceSeasonId), inArray(rosters.id, rosterIds)));

  const imported = [];

  for (const oldRoster of sourceRosters) {
    const [oldParticipant] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, oldRoster.participantId));
    if (!oldParticipant) continue;

    const activePlayers = await db
      .select({
        playerId: rosterPlayers.playerId,
        acquisitionPrice: rosterPlayers.acquisitionPrice,
        fullName: players.fullName,
        status: players.status,
      })
      .from(rosterPlayers)
      .innerJoin(players, eq(players.id, rosterPlayers.playerId))
      .where(and(eq(rosterPlayers.rosterId, oldRoster.id), eq(rosterPlayers.isActive, true)));

    const carryable = activePlayers.filter((p) => p.status !== "transferred");
    const skippedTransferred = activePlayers.filter((p) => p.status === "transferred");

    const rank = rankByRosterId.get(oldRoster.id) ?? standingsTable.length;
    const creditsBonus = creditsBonusForRank(rank);
    const creditsRemaining = Number(oldRoster.creditsRemaining ?? 0) + creditsBonus;

    const result = await db.transaction(async (tx) => {
      const [newParticipant] = await tx
        .insert(participants)
        .values({
          seasonId: targetSeasonId,
          userId: oldParticipant.userId,
          displayName: oldParticipant.displayName,
          teamName: oldParticipant.teamName,
          isActive: true,
        })
        .returning();

      const [newRoster] = await tx
        .insert(rosters)
        .values({
          seasonId: targetSeasonId,
          participantId: newParticipant.id,
          creditsRemaining: creditsRemaining.toString(),
        })
        .returning();

      if (carryable.length > 0) {
        await tx.insert(rosterPlayers).values(
          carryable.map((p) => ({
            rosterId: newRoster.id,
            playerId: p.playerId,
            seasonId: targetSeasonId,
            acquiredAt: new Date(),
            acquisitionPrice: p.acquisitionPrice,
            isActive: true,
          }))
        );
      }

      return { newParticipant, newRoster };
    });

    imported.push({
      oldRosterId: oldRoster.id,
      newRosterId: result.newRoster.id,
      teamName: oldParticipant.teamName || oldParticipant.displayName,
      rank,
      creditsBonus,
      creditsRemaining,
      playersCopied: carryable.length,
      playersSkippedTransferred: skippedTransferred.map((p) => ({ fullName: p.fullName })),
    });
  }

  return NextResponse.json({ imported });
}
