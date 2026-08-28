import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { matchdayFixtures } from "../../../../db/schema";
import { updateFixtureSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateFixtureSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const closesFixture =
    body.scoreHome !== undefined ||
    body.scoreAway !== undefined ||
    body.goalsHome !== undefined ||
    body.goalsAway !== undefined;

  const updated = await db
    .update(matchdayFixtures)
    .set({
      ...(body.rosterIdHome !== undefined && { rosterIdHome: body.rosterIdHome }),
      ...(body.rosterIdAway !== undefined && { rosterIdAway: body.rosterIdAway }),
      ...(body.scoreHome !== undefined && { scoreHome: body.scoreHome }),
      ...(body.scoreAway !== undefined && { scoreAway: body.scoreAway }),
      ...(body.goalsHome !== undefined && { goalsHome: body.goalsHome }),
      ...(body.goalsAway !== undefined && { goalsAway: body.goalsAway }),
      ...(body.status !== undefined && { status: body.status }),
      ...(closesFixture && body.status === undefined && { status: "played", playedAt: new Date() }),
    })
    .where(eq(matchdayFixtures.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(matchdayFixtures).where(eq(matchdayFixtures.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
