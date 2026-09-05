import { getAppSetting } from "./app-settings";

const API_BASE = "https://apileague.fantacalcio.it";

// Session tokens for leghe.fantacalcio.it — stored in the DB (edited from
// the protected /settings page) instead of env vars, since they expire and
// need updating without a redeploy.
async function authHeaders(): Promise<Record<string, string>> {
  const [appKey, authToken] = await Promise.all([
    getAppSetting("LEGHE_APP_KEY"),
    getAppSetting("LEGHE_AUTH_TOKEN"),
  ]);
  if (!appKey || !authToken) {
    throw new Error("LEGHE_APP_KEY / LEGHE_AUTH_TOKEN non configurati (vedi pagina Impostazioni)");
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
    { headers: await authHeaders() }
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
    headers: await authHeaders(),
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

// A different, richer team listing than fetchLegheTeams() above — used for
// lineups because it's keyed the same way the league's own UI names teams,
// which (unlike the older /league/teams endpoint) now matches
// participants.teamName spelling exactly (typos included), so no alias
// table is needed here: match case-insensitively on the raw name.
export type LegheParticipant = { teamId: number; teamName: string };

export async function fetchLegheParticipants(): Promise<LegheParticipant[]> {
  const res = await fetch(
    `${API_BASE}/onboarding/v1/invitation/participants?pageNumber=1&pageSize=1000`,
    { headers: await authHeaders() }
  );
  if (!res.ok) {
    throw new Error(`Participants leghe.fantacalcio.it: HTTP ${res.status}`);
  }
  const body = await res.json();
  // The API also returns each coach's name/email — deliberately dropped here,
  // this app has no use for it and it's personal data we shouldn't retain.
  return (body ?? []).map((t: { teamId: number; teamName: string }) => ({
    teamId: t.teamId,
    teamName: t.teamName,
  }));
}

export type LegheLineupPlayer = {
  pid: number; // matches players.externalId
  scr: number | null; // voto
  cscr: number | null; // fantavoto, already computed with this league's own bonus rules
};

export type LegheTeamLineup = {
  tid: number;
  mdl: string | null; // formation, e.g. "433"
  starts: LegheLineupPlayer[];
  bench: LegheLineupPlayer[];
};

export type LegheMatchLineup = {
  cal: boolean; // whether this matchday has been officially calculated yet
  mday: number;
  res: string; // "H-A" goals, may still be "0-0" while live/unplayed
  home: LegheTeamLineup;
  away: LegheTeamLineup;
};

export async function fetchLegheTeamLineup(
  competitionId: string,
  matchDay: number,
  championshipMatchDay: number,
  tIdHome: number,
  tIdAway: number
): Promise<LegheMatchLineup> {
  const res = await fetch(
    `${API_BASE}/gaming/v1/teamLineup/${competitionId}/${matchDay}/${championshipMatchDay}/${tIdHome}/${tIdAway}`,
    { headers: await authHeaders() }
  );
  if (!res.ok) {
    throw new Error(`Team lineup leghe.fantacalcio.it: HTTP ${res.status}`);
  }
  return res.json();
}

// Classic-role code used by /onboarding/v1/league/players — same 1-4 mapping
// as roster_players/matchdayLineups elsewhere in the project.
const ROLE_MAP: Record<number, "GK" | "DF" | "MF" | "FW"> = {
  1: "GK",
  2: "DF",
  3: "MF",
  4: "FW",
};

export type LegheListonePlayer = {
  externalId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string;
  currentValue: number;
  initialValue: number;
  fvm: number;
  imageUrl: string;
  priceUncertain: boolean;
};

type RawLegheListonePlayer = {
  id: number;
  lid: number;
  fcrle: number;
  name: string;
  tname: string;
  acsfc: number;
  icsfc: number;
  fvmfc: number;
  vers: string;
};

/**
 * Full Serie A listone — replaces the old /servizi/fantaasta CSV feed with
 * the same apileague.fantacalcio.it host/credentials already used for
 * calendar/teams/lineups, one fewer token to manage. Verified live against
 * the fantaasta feed: `id` matches players.externalId 1:1, `acsfc`/`icsfc`/
 * `fvmfc` (the "fc" = fantacalcio classic suffix, as opposed to "ma" =
 * mantra) match current/initial value/FVM exactly, `tname` matches team
 * name exactly. fantacalcio.it's price-uncertain asterisk shows up as a
 * trailing " *" in `name` here instead of a separate CSV column. There's no
 * ready-made image URL like fantaasta gave — it's rebuilt from `lid`
 * (this league's numeric id, constant), `id` and `vers`, matching the
 * pattern already stored on existing players (verified byte-for-byte on a
 * live sample).
 */
export async function fetchLegheListone(): Promise<LegheListonePlayer[]> {
  const res = await fetch(`${API_BASE}/onboarding/v1/league/players`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Listone leghe.fantacalcio.it: HTTP ${res.status}`);
  }
  const body: { players: RawLegheListonePlayer[] } = await res.json();

  const players: LegheListonePlayer[] = [];
  for (const p of body.players ?? []) {
    const position = ROLE_MAP[p.fcrle];
    const teamName = p.tname?.trim();
    const rawName = p.name?.trim();
    if (!position || !teamName || !rawName || !p.id) continue;

    const priceUncertain = rawName.endsWith("*");
    const fullName = priceUncertain ? rawName.replace(/\*+$/, "").trim() : rawName;

    players.push({
      externalId: String(p.id),
      fullName,
      position,
      teamName,
      currentValue: Number(p.acsfc) || 0,
      initialValue: Number(p.icsfc) || 0,
      fvm: Number(p.fvmfc) || 0,
      imageUrl: `https://content.fantacalcio.it/web/campioncini/${p.lid}/card/${p.id}.png?${p.vers}`,
      priceUncertain,
    });
  }
  return players;
}
