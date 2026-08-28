import { NextResponse } from "next/server";
import { and, isNotNull, ne, notInArray, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { players } from "../../../../db/schema";
import { fetchFantaastaPlayers, type FantaastaPlayer } from "../../../../lib/fantaasta-client";

export async function POST() {
  let feed: FantaastaPlayer[];
  try {
    feed = await fetchFantaastaPlayers();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync fantaasta fallita" },
      { status: 502 }
    );
  }

  // One round trip to know what already exists, instead of one SELECT per feed row.
  const existingRows = await db
    .select({ id: players.id, externalId: players.externalId, status: players.status })
    .from(players);
  const existingByExternalId = new Map(
    existingRows.filter((r) => r.externalId).map((r) => [r.externalId as string, r])
  );

  const toInsert: FantaastaPlayer[] = [];
  const toUpdate: (FantaastaPlayer & { id: string })[] = [];
  let reactivated = 0;

  for (const row of feed) {
    const existing = existingByExternalId.get(row.externalId);
    if (!existing) {
      toInsert.push(row);
    } else {
      toUpdate.push({ ...row, id: existing.id });
      if (existing.status === "transferred") reactivated += 1;
    }
  }

  // Bulk insert: one INSERT with multiple VALUES instead of N.
  if (toInsert.length > 0) {
    await db.insert(players).values(
      toInsert.map((row) => ({
        externalId: row.externalId,
        fullName: row.fullName,
        position: row.position,
        teamName: row.teamName,
        currentValue: row.currentValue.toString(),
        initialValue: row.initialValue.toString(),
        fvm: row.fvm.toString(),
        imageUrl: row.imageUrl,
        status: "active" as const,
      }))
    );
  }

  // Bulk update: one UPDATE ... FROM (VALUES ...) instead of N round trips.
  if (toUpdate.length > 0) {
    const valueRows = toUpdate.map(
      (row) =>
        sql`(${row.id}::uuid, ${row.fullName}, ${row.position}::player_position, ${row.teamName}, ${row.currentValue.toString()}::numeric, ${row.initialValue.toString()}::numeric, ${row.fvm.toString()}::numeric, ${row.imageUrl})`
    );
    await db.execute(sql`
      UPDATE players AS p
      SET
        full_name = v.full_name,
        position = v.position,
        team_name = v.team_name,
        current_value = v.current_value,
        initial_value = v.initial_value,
        fvm = v.fvm,
        image_url = v.image_url,
        status = 'active'
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(id, full_name, position, team_name, current_value, initial_value, fvm, image_url)
      WHERE p.id = v.id
    `);
  }

  // Players we already know (real listone entries, not our own score-import
  // stubs) that dropped out of the live feed have left Serie A. Keep them —
  // just mark unassignable in case they come back. Single statement, no loop.
  const feedIds = feed.map((row) => row.externalId);
  const markedRows = await db
    .update(players)
    .set({ status: "transferred" })
    .where(
      and(
        isNotNull(players.externalId),
        isNotNull(players.teamName),
        ne(players.status, "transferred"),
        feedIds.length > 0 ? notInArray(players.externalId, feedIds) : undefined
      )
    )
    .returning({ id: players.id });

  return NextResponse.json({
    created: toInsert.length,
    updated: toUpdate.length,
    reactivated,
    markedTransferred: markedRows.length,
  });
}
