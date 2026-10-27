import { NextResponse } from "next/server";
import { and, desc, eq, sql as sqlOp } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayScores, participants, players, rosterPlayers, rosters } from "../../../../db/schema";

// Season's top scorer by total fantapunti, with just what the dashboard tile
// shows (image, Serie A club, owning fantasy team). One query instead of
// shipping every player's stats plus the whole players table to the client.
export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }

  const totalScore = sqlOp<number>`coalesce(sum(${matchdayScores.score}), 0)`.mapWith(Number);

  const [top] = await db
    .select({
      playerId: players.id,
      fullName: players.fullName,
      position: players.position,
      teamName: players.teamName,
      imageUrl: players.imageUrl,
      totalScore,
      // Ownership is per season: the same player can sit in different rosters
      // across seasons, so join on this season's roster_players row.
      ownerRosterName: sqlOp<string | null>`max(coalesce(${participants.teamName}, ${participants.displayName}, ${rosters.name}))`,
    })
    .from(matchdayScores)
    .innerJoin(players, eq(players.id, matchdayScores.playerId))
    .leftJoin(
      rosterPlayers,
      and(eq(rosterPlayers.playerId, players.id), eq(rosterPlayers.seasonId, seasonId))
    )
    .leftJoin(rosters, eq(rosters.id, rosterPlayers.rosterId))
    .leftJoin(participants, eq(participants.id, rosters.participantId))
    .where(eq(matchdayScores.seasonId, seasonId))
    .groupBy(players.id, players.fullName, players.position, players.teamName, players.imageUrl)
    .orderBy(desc(totalScore))
    .limit(1);

  if (!top || top.totalScore <= 0) return NextResponse.json(null);
  return NextResponse.json(top);
}
