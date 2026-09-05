import { NextResponse } from "next/server";
import { getPastSeasonsChampions } from "../../../../lib/champions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }
  const seasons = await getPastSeasonsChampions(seasonId);
  return NextResponse.json({ seasons });
}
