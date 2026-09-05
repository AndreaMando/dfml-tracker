import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { participants, seasons } from "../../../../db/schema";
import { updateSeasonSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateSeasonSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const updated = await db
    .update(seasons)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.year !== undefined && { year: Number(body.year) }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.startDate !== undefined && {
        startDate: body.startDate ? new Date(body.startDate) : null,
      }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.leagueCompetitionId !== undefined && { leagueCompetitionId: body.leagueCompetitionId }),
      ...(body.cupCompetitionId !== undefined && { cupCompetitionId: body.cupCompetitionId }),
    })
    .where(eq(seasons.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  // A concluded season's participants (and their rosters, which derive
  // "active" from the participant) go inactive — carrying over into a new
  // season reactivates them there as a fresh participant row, active by
  // default, via the roster-import flow.
  if (body.status === "finished" || body.status === "archived") {
    await db.update(participants).set({ isActive: false }).where(eq(participants.seasonId, id));
  }

  return NextResponse.json(updated[0]);
}
