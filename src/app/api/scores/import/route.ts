import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { players, rosterPlayers, rosters, matchdayScores } from "../../../../db/schema";
import { fetchGiornataVoti } from "../../../../lib/fantacalcio-scraper";
import { computeFantavoto } from "../../../../lib/fantavoto";
import { importScoresSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, importScoresSchema);
  if ("response" in parsed) return parsed.response;
  const { seasonId, matchdayNumber, fantacalcioSeason, fantacalcioMatchday } = parsed.data;

  let rows;
  try {
    rows = await fetchGiornataVoti(fantacalcioSeason, fantacalcioMatchday);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import da Fantacalcio.it fallito" },
      { status: 502 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, created: [] });
  }

  // One round trip for all known players instead of one SELECT per row.
  const externalIds = rows.map((r) => r.externalId);
  const existingPlayers = await db
    .select({ id: players.id, externalId: players.externalId, position: players.position })
    .from(players)
    .where(inArray(players.externalId, externalIds));
  const playerByExternalId = new Map(
    existingPlayers.filter((p) => p.externalId).map((p) => [p.externalId as string, p])
  );

  // Listone snapshot is not live-updated — a player can appear in real Serie A
  // matches without being in our players table (late transfer, recall from
  // loan, etc). Create bare stubs instead of dropping the bonus/malus, so
  // nothing is lost; teamName/currentValue stay null for manual completion
  // later from /players/[id]. One bulk INSERT instead of N.
  const missingRows = rows.filter((r) => !playerByExternalId.has(r.externalId));
  const created: string[] = [];
  if (missingRows.length > 0) {
    const inserted = await db
      .insert(players)
      .values(
        missingRows.map((r) => ({
          externalId: r.externalId,
          fullName: r.fullName,
          position: r.position,
          status: "active" as const,
        }))
      )
      .returning({ id: players.id, externalId: players.externalId, position: players.position });
    for (const p of inserted) {
      if (p.externalId) playerByExternalId.set(p.externalId, p);
    }
    created.push(...missingRows.map((r) => r.fullName));
  }

  // One round trip for roster ownership of every involved player instead of one per row.
  const playerIds = [...playerByExternalId.values()].map((p) => p.id);
  const ownerRows =
    playerIds.length > 0
      ? await db
          .select({ playerId: rosterPlayers.playerId, rosterId: rosters.id })
          .from(rosterPlayers)
          .innerJoin(rosters, eq(rosters.id, rosterPlayers.rosterId))
          .where(inArray(rosterPlayers.playerId, playerIds))
      : [];
  const rosterIdByPlayerId = new Map(ownerRows.map((r) => [r.playerId, r.rosterId]));

  const values = rows
    .map((row) => {
      const player = playerByExternalId.get(row.externalId);
      if (!player) return null;
      const cleanSheet = player.position === "GK" && row.goalsConceded === 0;
      const score = computeFantavoto(player.position, {
        vote: row.vote,
        goals: row.goals,
        assists: row.assists,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
        cleanSheet,
        penaltiesSaved: row.penaltiesSaved,
        penaltiesMissed: row.penaltiesMissed,
        ownGoals: row.ownGoals,
      });
      return {
        seasonId,
        rosterId: rosterIdByPlayerId.get(player.id) ?? null,
        playerId: player.id,
        matchdayNumber: Number(matchdayNumber),
        vote: row.vote?.toString() ?? null,
        score: score.toString(),
        goals: row.goals,
        assists: row.assists,
        penaltiesScored: row.penaltiesScored,
        penaltiesMissed: row.penaltiesMissed,
        penaltiesSaved: row.penaltiesSaved,
        cleanSheet,
        goalsConceded: row.goalsConceded,
        ownGoals: row.ownGoals,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // One multi-row INSERT ... ON CONFLICT DO UPDATE instead of one upsert per row.
  if (values.length > 0) {
    await db
      .insert(matchdayScores)
      .values(values)
      .onConflictDoUpdate({
        target: [matchdayScores.seasonId, matchdayScores.playerId, matchdayScores.matchdayNumber],
        set: {
          rosterId: sql`excluded.roster_id`,
          vote: sql`excluded.vote`,
          score: sql`excluded.score`,
          goals: sql`excluded.goals`,
          assists: sql`excluded.assists`,
          penaltiesScored: sql`excluded.penalties_scored`,
          penaltiesMissed: sql`excluded.penalties_missed`,
          penaltiesSaved: sql`excluded.penalties_saved`,
          cleanSheet: sql`excluded.clean_sheet`,
          goalsConceded: sql`excluded.goals_conceded`,
          ownGoals: sql`excluded.own_goals`,
          yellowCards: sql`excluded.yellow_cards`,
          redCards: sql`excluded.red_cards`,
        },
      });
  }

  return NextResponse.json({ imported: values.length, created });
}
