import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { marketSessions } from "../../../../db/schema";
import { updateMarketSessionSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(request, updateMarketSessionSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const updated = await db
    .update(marketSessions)
    .set({
      ...(body.type !== undefined && { type: body.type }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.startDate !== undefined && {
        startDate: body.startDate ? new Date(body.startDate) : null,
      }),
      ...(body.endDate !== undefined && {
        endDate: body.endDate ? new Date(body.endDate) : null,
      }),
    })
    .where(eq(marketSessions.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Market session not found" }, { status: 404 });
  }
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(marketSessions).where(eq(marketSessions.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Market session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
