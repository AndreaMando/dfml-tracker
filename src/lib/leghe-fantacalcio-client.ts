const API_BASE = "https://apileague.fantacalcio.it";

function authHeaders(): Record<string, string> {
  const appKey = process.env.LEGHE_APP_KEY;
  const authToken = process.env.LEGHE_AUTH_TOKEN;
  if (!appKey || !authToken) {
    throw new Error("LEGHE_APP_KEY / LEGHE_AUTH_TOKEN non configurati in .env.local");
  }
  return {
    accept: "application/json",
    App_Key: appKey,
    Authorization: authToken,
    origin: "https://leghe.fantacalcio.it",
    referer: "https://leghe.fantacalcio.it/",
  };
}

export type LegheMatch = {
  tIdH: number;
  tIdA: number;
  ptH: number;
  ptA: number;
  standingPtH: number;
  standingPtA: number;
  result: string; // "H-A" goals, e.g. "2-1", or "-" if not played
  resultSR: string;
};

export type LegheMatchday = {
  matchDay: number;
  championshipMatchDay: number;
  calculated: boolean;
  matches: LegheMatch[];
};

export async function fetchLegheCalendar(competitionId: string): Promise<LegheMatchday[]> {
  const res = await fetch(
    `${API_BASE}/onboarding/v1/league/competition/calendar/${competitionId}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    throw new Error(`Calendario leghe.fantacalcio.it: HTTP ${res.status}`);
  }
  return res.json();
}

export type LegheTeam = { id: number; name: string };

// leghe.fantacalcio.it spells team names inconsistently (case/typos) vs our
// roster names — same alias table used for the Excel calendar import.
const TEAM_ALIASES: Record<string, string> = {
  "il demone veste doufike": "Il Demone Veste Double",
  "gioubentus fc": "Giobentus FC",
  "fc mano de dios": "FC Mano de Dios",
  "fc ettanera": "FC Ettanera",
  "fc san patrignano calcio": "FC San Patrignano Calcio",
  "aston vigna": "Aston Vigna",
  "parmareggio": "Parmareggio",
  "real milano": "Real Milano",
};

export function normalizeLegheTeamName(raw: string): string | null {
  return TEAM_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export async function fetchLegheTeams(): Promise<LegheTeam[]> {
  const res = await fetch(`${API_BASE}/onboarding/v1/league/teams`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Teams leghe.fantacalcio.it: HTTP ${res.status}`);
  }
  const body = await res.json();
  return (body.data ?? []).map((t: { id: number; n: string }) => ({ id: t.id, name: t.n }));
}

/** Parses a "H-A" goals string (e.g. "2-1") into { home, away }, or null if unplayed ("-"). */
export function parseResult(result: string): { home: number; away: number } | null {
  const match = result.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}
