import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { financialTransactions } from "../../../db/schema";
import { createFinancialTransactionSchema } from "../../../lib/schemas";
import { parseJsonBody } from "../../../lib/validate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  const rows = await db
    .select()
    .from(financialTransactions)
    .where(seasonId ? eq(financialTransactions.seasonId, seasonId) : undefined);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createFinancialTransactionSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const inserted = await db
    .insert(financialTransactions)
    .values({
      seasonId: body.seasonId,
      participantId: body.participantId ?? null,
      type: body.type,
      amount: body.amount,
      description: body.description ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}
