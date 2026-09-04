import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { matchdayFixtures, participants, rosters } from "../../../db/schema";
import { createFixtureSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const matchdayNumber = searchParams.get("matchdayNumber");
  const linkedMatchdayNumber = searchParams.get("linkedMatchdayNumber");
  // Every existing caller expects campionato fixtures only — default to
  // "league" so adding cup rows to this table never changes their results.
  const competition = searchParams.get("competition") ?? "league";

  const conditions = [
    ...(seasonId ? [eq(matchdayFixtures.seasonId, seasonId)] : []),
    ...(matchdayNumber ? [eq(matchdayFixtures.matchdayNumber, Number(matchdayNumber))] : []),
    ...(linkedMatchdayNumber ? [eq(matchdayFixtures.linkedMatchdayNumber, Number(linkedMatchdayNumber))] : []),
    eq(matchdayFixtures.competition, competition as "league" | "cup"),
  ];

  const rows = await db
    .select()
    .from(matchdayFixtures)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(matchdayFixtures.matchdayNumber);

  // The fantasy team name is set on the Participants page (teamName) —
  // that's the single source of truth everywhere it's displayed, rosters.name
  // is only a last-resort legacy fallback. Resolved in JS (one small lookup
  // query) rather than a raw-SQL subquery join, which drizzle doesn't alias
  // correctly for a computed column referenced from the outer select.
  const rosterIds = [
    ...new Set(rows.flatMap((f) => [f.rosterIdHome, f.rosterIdAway]).filter((id): id is string => !!id)),
  ];
  const rosterRows = rosterIds.length
    ? await db.select().from(rosters).where(inArray(rosters.id, rosterIds))
    : [];
  const participantIds = [...new Set(rosterRows.map((r) => r.participantId))];
  const participantRows = participantIds.length
    ? await db.select().from(participants).where(inArray(participants.id, participantIds))
    : [];
  const participantById = new Map(participantRows.map((p) => [p.id, p]));
  const teamNameByRosterId = new Map(
    rosterRows.map((r) => {
      const participant = participantById.get(r.participantId);
      return [r.id, participant?.teamName || participant?.displayName || r.name];
    })
  );

  const result = rows.map((f) => ({
    ...f,
    homeName: f.rosterIdHome ? teamNameByRosterId.get(f.rosterIdHome) ?? null : null,
    awayName: f.rosterIdAway ? teamNameByRosterId.get(f.rosterIdAway) ?? null : null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createFixtureSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const inserted = await db
    .insert(matchdayFixtures)
    .values({
      seasonId: body.seasonId,
      matchdayNumber: body.matchdayNumber,
      rosterIdHome: body.rosterIdHome ?? null,
      rosterIdAway: body.rosterIdAway ?? null,
      status: body.status ?? "scheduled",
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
