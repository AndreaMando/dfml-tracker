import { NextResponse } from "next/server";
import { db } from "../../../db";
import { seasons, rosters, marketMovements } from "../../../db/schema";

export async function GET() {
  const seasonsData = await db.select().from(seasons);
  const rostersData = await db.select().from(rosters);
  const movements = await db.select().from(marketMovements);

  return NextResponse.json({ seasons: seasonsData, rosters: rostersData, movements });
}
