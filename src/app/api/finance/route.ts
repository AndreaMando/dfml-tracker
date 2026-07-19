import { NextResponse } from "next/server";
import { db } from "../../../db";
import { financialTransactions } from "../../../db/schema";

export async function GET() {
  const rows = await db.select().from(financialTransactions);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

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
