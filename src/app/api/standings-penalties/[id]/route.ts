import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { standingsPenalties } from "../../../../db/schema";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await db.delete(standingsPenalties).where(eq(standingsPenalties.id, id)).returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "Penalty not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
