import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import {
  lineupPlayers,
  matchdayFixtures,
  matchdayLineups,
  matchdayScores,
  participants,
  players,
  rosters,
} from "../../../db/schema";
import { createLineupSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const matchdayNumber = searchParams.get("matchdayNumber");
  // Every existing caller expects campionato lineups only — default to
  // "league" so cup rows never change their results.
  const competition = (searchParams.get("competition") ?? "league") as "league" | "cup";

  if (!seasonId || !matchdayNumber) {
    const rows = await db.select().from(matchdayLineups);
    return NextResponse.json(rows);
  }

  // matchdayScores is keyed on the real Serie A round, not the cup's own
  // round number — for the cup, look that up from the fixture we already
  // stored it on (linkedMatchdayNumber) instead of using matchdayNumber
  // directly (which for the league is the same value anyway).
  let realMatchdayNumber = Number(matchdayNumber);
  if (competition === "cup") {
    const [cupFixture] = await db
      .select({ linkedMatchdayNumber: matchdayFixtures.linkedMatchdayNumber })
      .from(matchdayFixtures)
      .where(
        and(
          eq(matchdayFixtures.seasonId, seasonId),
          eq(matchdayFixtures.matchdayNumber, Number(matchdayNumber)),
          eq(matchdayFixtures.competition, "cup")
        )
      )
      .limit(1);
    if (cupFixture?.linkedMatchdayNumber) realMatchdayNumber = cupFixture.linkedMatchdayNumber;
  }

  const lineupRows = await db
    .select({
      lineupId: matchdayLineups.id,
      rosterId: matchdayLineups.rosterId,
      formation: matchdayLineups.formation,
      // The fantasy team name is set on the Participants page (teamName) —
      // the single source of truth everywhere it's displayed.
      rosterName: participants.teamName,
      displayName: participants.displayName,
    })
    .from(matchdayLineups)
    .innerJoin(rosters, eq(rosters.id, matchdayLineups.rosterId))
    .innerJoin(participants, eq(participants.id, rosters.participantId))
    .where(
      and(
        eq(matchdayLineups.seasonId, seasonId),
        eq(matchdayLineups.matchdayNumber, Number(matchdayNumber)),
        eq(matchdayLineups.competition, competition)
      )
    );

  const result = await Promise.all(
    lineupRows.map(async (lineup) => {
      const rows = await db
        .select({
          playerId: players.id,
          fullName: players.fullName,
          position: players.position,
          role: lineupPlayers.role,
          playedNoVote: lineupPlayers.playedNoVote,
          vote: matchdayScores.vote,
          score: matchdayScores.score,
        })
        .from(lineupPlayers)
        .innerJoin(players, eq(players.id, lineupPlayers.playerId))
        .leftJoin(
          matchdayScores,
          and(
            eq(matchdayScores.playerId, lineupPlayers.playerId),
            eq(matchdayScores.seasonId, seasonId),
            eq(matchdayScores.matchdayNumber, realMatchdayNumber)
          )
        )
        .where(eq(lineupPlayers.lineupId, lineup.lineupId));

      return {
        rosterId: lineup.rosterId,
        rosterName: lineup.rosterName || lineup.displayName,
        formation: lineup.formation,
        starters: rows.filter((r) => r.role === "starter"),
        bench: rows.filter((r) => r.role === "bench"),
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createLineupSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const insertedLineup = await db
    .insert(matchdayLineups)
    .values({
      seasonId: body.seasonId,
      rosterId: body.rosterId,
      matchdayNumber: body.matchdayNumber,
      formation: body.formation ?? null,
      submittedAt: body.submittedAt ? new Date(body.submittedAt) : null,
    })
    .returning();

  const lineupId = insertedLineup[0]?.id;

  if (lineupId && body.players && body.players.length > 0) {
    await db.insert(lineupPlayers).values(
      body.players.map((player) => ({
        lineupId,
        playerId: player.playerId,
        role: player.role,
        positionIndex: player.positionIndex ?? null,
      }))
    );
  }

  return NextResponse.json(insertedLineup[0]);
}
