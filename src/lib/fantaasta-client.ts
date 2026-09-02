const API_URL = "https://leghe.fantacalcio.it/servizi/fantaasta";

// Same classic-role mapping used everywhere else in the project (scripts/import-data.mjs).
const POSITION_MAP: Record<string, "GK" | "DF" | "MF" | "FW"> = {
  P: "GK",
  D: "DF",
  C: "MF",
  A: "FW",
};

const EXPECTED_FIELD_COUNT = 22;

export type FantaastaPlayer = {
  externalId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string;
  currentValue: number;
  initialValue: number;
  fvm: number;
  imageUrl: string | null;
  priceUncertain: boolean;
};

function authHeaders(): Record<string, string> {
  const token = process.env.FANTAASTA_AUTH_TOKEN;
  if (!token) {
    throw new Error("FANTAASTA_AUTH_TOKEN non configurato in .env.local");
  }
  return {
    accept: "application/json, text/plain, */*",
    authorization: token,
    origin: "https://fanta-asta-live.fantacalcio.it",
    referer: "https://fanta-asta-live.fantacalcio.it/",
  };
}

/**
 * Parses one CSV-like line from /servizi/fantaasta into a typed record.
 * Field layout (0-based, no header row), reverse-engineered by cross-referencing
 * a live pull against players already imported from the Quotazioni Excel:
 *   0 id, 1 shortName, 2 fullName, 3 role(P/D/C/A), 4 roleMantra(ignored),
 *   5 qtA classic (current value), 6 qtI classic (initial value),
 *   7-8 mantra current/initial (ignored), 9 teamName,
 *   10 fvm classic, 11 fvm mantra (ignored),
 *   12 foot, 13 nationality (ignored), 14 birthdate "dd/mm/yyyy HH:MM:SS",
 *   15 imageUrl, 16 priceUncertain (1 = the asterisk fantacalcio.it shows
 *   next to the quotation — roster status uncertain: long-term injury,
 *   transfer limbo, etc. Distinct from a player fully dropping out of the
 *   feed — these players are still listed, under their current team, just
 *   flagged),
 *   17-20 live stats/flags (ignored), 21 constant season code (ignored).
 */
function parseLine(line: string): FantaastaPlayer | null {
  const fields = line.split(",");
  if (fields.length < EXPECTED_FIELD_COUNT) return null;

  const externalId = fields[0]?.trim();
  const role = fields[3]?.trim();
  const fullName = fields[2]?.trim();
  const teamName = fields[9]?.trim();
  if (!externalId || !role || !fullName || !teamName) return null;

  const position = POSITION_MAP[role];
  if (!position) return null;

  const currentValue = Number(fields[5]);
  const initialValue = Number(fields[6]);
  const fvm = Number(fields[10]);
  const imageUrl = fields[15]?.trim() || null;
  const priceUncertain = fields[16]?.trim() === "1";

  return {
    externalId,
    fullName,
    position,
    teamName,
    currentValue: Number.isFinite(currentValue) ? currentValue : 0,
    initialValue: Number.isFinite(initialValue) ? initialValue : 0,
    fvm: Number.isFinite(fvm) ? fvm : 0,
    imageUrl,
    priceUncertain,
  };
}

export async function fetchFantaastaPlayers(): Promise<FantaastaPlayer[]> {
  const res = await fetch(API_URL, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`fantaasta: HTTP ${res.status}`);
  }
  const body = await res.text();
  const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const players: FantaastaPlayer[] = [];
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) players.push(parsed);
  }
  return players;
}
