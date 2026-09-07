import { NextResponse } from "next/server";

const API_BASE = "https://api.football-data.org/v4";
const SERIE_A_CODE = "SA";

export type LiveMatchStatus = "live" | "scheduled" | "finished";

export type LiveMatch = {
  id: number;
  homeTeam: { name: string; logo: string | null };
  awayTeam: { name: string; logo: string | null };
  status: LiveMatchStatus;
  score: { home: number | null; away: number | null };
  minute: number | null;
  kickoffDateTime: string;
};

type RawTeam = { name: string; shortName: string | null; crest: string | null };
type RawScoreLine = { home: number | null; away: number | null };
type RawMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  score: { fullTime: RawScoreLine; halfTime: RawScoreLine };
};

function mapStatus(raw: string): LiveMatchStatus {
  switch (raw) {
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "SCHEDULED":
    case "TIMED":
    case "POSTPONED":
    case "SUSPENDED":
    case "CANCELLED":
    default:
      return "scheduled";
  }
}

function mapMatch(raw: RawMatch): LiveMatch {
  const status = mapStatus(raw.status);
  const fullTime = raw.score.fullTime;
  // On some plans fullTime stays null while the match is live — fall back
  // to halfTime rather than showing a blank score once the first half ends.
  const useHalfTimeFallback = status === "live" && fullTime.home === null && fullTime.away === null;
  const score = useHalfTimeFallback ? raw.score.halfTime : fullTime;

  return {
    id: raw.id,
    // shortName ("Milan", "Inter") over the full legal name ("AC Milan",
    // "FC Internazionale Milano") — that's what fits a compact card/row.
    homeTeam: { name: raw.homeTeam.shortName || raw.homeTeam.name, logo: raw.homeTeam.crest ?? null },
    awayTeam: { name: raw.awayTeam.shortName || raw.awayTeam.name, logo: raw.awayTeam.crest ?? null },
    status,
    score: { home: score.home ?? null, away: score.away ?? null },
    minute: raw.minute ?? null,
    kickoffDateTime: raw.utcDate,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchdayRaw = searchParams.get("matchday");
  const matchday = matchdayRaw ? Number(matchdayRaw) : NaN;
  if (!Number.isInteger(matchday) || matchday < 1) {
    return NextResponse.json({ error: "matchday is required and must be a positive integer" }, { status: 400 });
  }

  // Naming note: this key lives in .env.local as API_FOOTBALL_KEY (leftover
  // from an earlier api-football.com plan) but is a football-data.org token
  // — verified live against api.football-data.org/v4, works fine.
  const token = process.env.API_FOOTBALL_KEY;
  if (!token) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY non configurata in .env.local" }, { status: 500 });
  }

  let res: Response;
  try {
    // One fetch per invocation; Next's Data Cache (revalidate: 30) also
    // dedupes concurrent invocations for the same matchday within the
    // window, keeping this well under football-data.org's 10 req/min cap.
    res = await fetch(`${API_BASE}/competitions/${SERIE_A_CODE}/matches?matchday=${matchday}`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 30 },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Live matches fetch failed" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `football-data.org: HTTP ${res.status}` },
      { status: res.status === 429 ? 429 : 502 }
    );
  }

  const body: { matches: RawMatch[] } = await res.json();
  return NextResponse.json(body.matches.map(mapMatch));
}
