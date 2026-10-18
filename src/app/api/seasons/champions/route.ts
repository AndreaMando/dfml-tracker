import { NextResponse } from "next/server";
import { getPastSeasonsChampions } from "../../../../lib/champions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
  }
  const seasons = await getPastSeasonsChampions(seasonId);
  // Past-season winners only change when a season is closed — safe for the
  // CDN to serve for a minute and revalidate in the background.
  return NextResponse.json({ seasons }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
