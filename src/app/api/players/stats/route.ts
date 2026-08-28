import { NextResponse } from "next/server";
import { and, eq, sql as sqlOp } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayScores, players } from "../../../../db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }

  const rows = await db
    .select({
      playerId: players.id,
      fullName: players.fullName,
      position: players.position,
      teamName: players.teamName,
      status: players.status,
      appearances: sqlOp<number>`count(${matchdayScores.id})`.mapWith(Number),
      totalScore: sqlOp<number>`coalesce(sum(${matchdayScores.score}), 0)`.mapWith(Number),
      avgVote: sqlOp<number>`coalesce(avg(${matchdayScores.vote}), 0)`.mapWith(Number),
      goals: sqlOp<number>`coalesce(sum(${matchdayScores.goals}), 0)`.mapWith(Number),
      assists: sqlOp<number>`coalesce(sum(${matchdayScores.assists}), 0)`.mapWith(Number),
      yellowCards: sqlOp<number>`coalesce(sum(${matchdayScores.yellowCards}), 0)`.mapWith(Number),
      redCards: sqlOp<number>`coalesce(sum(${matchdayScores.redCards}), 0)`.mapWith(Number),
      ownGoals: sqlOp<number>`coalesce(sum(${matchdayScores.ownGoals}), 0)`.mapWith(Number),
      penaltiesMissed: sqlOp<number>`coalesce(sum(${matchdayScores.penaltiesMissed}), 0)`.mapWith(Number),
      penaltiesSaved: sqlOp<number>`coalesce(sum(${matchdayScores.penaltiesSaved}), 0)`.mapWith(Number),
      cleanSheets: sqlOp<number>`coalesce(sum(case when ${matchdayScores.cleanSheet} then 1 else 0 end), 0)`.mapWith(
        Number
      ),
    })
    .from(players)
    .leftJoin(
      matchdayScores,
      and(eq(matchdayScores.playerId, players.id), eq(matchdayScores.seasonId, seasonId))
    )
    .groupBy(players.id, players.fullName, players.position, players.teamName, players.status);

  return NextResponse.json(rows);
}
