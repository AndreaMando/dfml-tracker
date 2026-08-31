import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { matchdayFixtures, participants, rosters, standings } from "../../../db/schema";

type Row = {
  rosterId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  totalScore: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }

  const seasonRosters = await db.select().from(rosters).where(eq(rosters.seasonId, seasonId));
  const table = new Map<string, Row>();
  for (const roster of seasonRosters) {
    table.set(roster.id, {
      rosterId: roster.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      totalScore: 0,
    });
  }

  const fixtures = await db
    .select()
    .from(matchdayFixtures)
    .where(eq(matchdayFixtures.seasonId, seasonId));

  for (const fixture of fixtures) {
    if (fixture.status !== "played") continue;
    if (!fixture.rosterIdHome || !fixture.rosterIdAway) continue;
    const home = table.get(fixture.rosterIdHome);
    const away = table.get(fixture.rosterIdAway);
    if (!home || !away) continue;

    const scoreHome = Number(fixture.scoreHome ?? 0);
    const scoreAway = Number(fixture.scoreAway ?? 0);

    home.played += 1;
    away.played += 1;
    home.totalScore += scoreHome;
    away.totalScore += scoreAway;

    // The real league determines the outcome by goals (converted from
    // fantapunti via leghe.fantacalcio.it's own table), not by comparing raw
    // fantapunti directly — two different fantapunti totals can still be a
    // draw. Use goalsHome/goalsAway when available; fall back to comparing
    // fantapunti for fixtures entered manually without goals.
    const hasGoals = fixture.goalsHome !== null && fixture.goalsAway !== null;
    const homeMetric = hasGoals ? Number(fixture.goalsHome) : scoreHome;
    const awayMetric = hasGoals ? Number(fixture.goalsAway) : scoreAway;

    if (homeMetric > awayMetric) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (homeMetric < awayMetric) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  // The fantasy team name is set on the Participants page (teamName) —
  // that's the single source of truth everywhere it's displayed.
  const participantIds = seasonRosters.map((r) => r.participantId);
  const participantRows = participantIds.length
    ? await db.select().from(participants).where(inArray(participants.id, participantIds))
    : [];
  const participantById = new Map(participantRows.map((p) => [p.id, p]));
  const rosterNameMap = new Map(
    seasonRosters.map((r) => {
      const participant = participantById.get(r.participantId);
      return [r.id, participant?.teamName || participant?.displayName || r.name];
    })
  );
  const rows = Array.from(table.values());

  // Cache into standings table (upsert per season+roster).
  for (const row of rows) {
    await db
      .insert(standings)
      .values({
        seasonId,
        rosterId: row.rosterId,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        points: row.points,
        totalScore: row.totalScore.toString(),
      })
      .onConflictDoUpdate({
        target: [standings.seasonId, standings.rosterId],
        set: {
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          points: row.points,
          totalScore: row.totalScore.toString(),
          updatedAt: new Date(),
        },
      });
  }

  const sorted = rows
    .map((row) => ({ ...row, rosterName: rosterNameMap.get(row.rosterId) ?? null }))
    .sort((a, b) => b.points - a.points || b.totalScore - a.totalScore);

  return NextResponse.json(sorted);
}

export async function POST(request: Request) {
  const body = await request.json();

  const inserted = await db
    .insert(standings)
    .values({
      seasonId: body.seasonId,
      rosterId: body.rosterId,
      played: body.played ?? 0,
      won: body.won ?? 0,
      drawn: body.drawn ?? 0,
      lost: body.lost ?? 0,
      points: body.points ?? 0,
      totalScore: body.totalScore ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
