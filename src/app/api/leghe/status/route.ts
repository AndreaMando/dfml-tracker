import { NextResponse } from "next/server";
import { checkLegheAuth } from "../../../../lib/leghe-fantacalcio-client";
import { cached } from "../../../../lib/ttl-cache";

// Lets the UI tell visitors when the leghe.fantacalcio.it session token has
// been revoked — otherwise sync silently stops and the site just looks
// frozen. Memoized so every page polling it shares one upstream call a
// minute (and cleared when new credentials are saved in Impostazioni).
export async function GET() {
  const status = await cached("leghe:status", 60_000, checkLegheAuth);
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
