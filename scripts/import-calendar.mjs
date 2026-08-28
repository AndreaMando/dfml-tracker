// One-off / repeatable bulk import of the DFML fixture calendar.
//
// Usage:
//   node scripts/import-calendar.mjs --file "<path-to-Calendario_DFML.xlsx>" --season "DFML 26/27" --year 2026
//
// The sheet is laid out as two side-by-side giornata blocks per group of
// rows: a header row ("Nª Giornata lega" in col A, "N+1ª Giornata lega" in
// col G) followed by 4 match rows. Each match row encodes ONE fixture for
// the left giornata (cols A/D: home/away) AND one for the right giornata
// (cols G/J), simultaneously. Columns B/C/H/I are "0" placeholders (the
// calendar template has not been played yet) and are ignored — real
// results are entered separately via /scores.
//
// Idempotent: existing fixtures (matched on season+matchday+home+away) are
// never touched, so already-played results are safe on re-run.

import dotenv from "dotenv";
import postgres from "postgres";
import XLSX from "xlsx";

dotenv.config({ path: ".env.local" });

// Fantacalcio.it's "leghe" export spells team names inconsistently
// (case/typos) compared to our roster names. Map explicitly rather than
// fuzzy-matching, since the set of teams is small and known.
const TEAM_ALIASES = {
  "il demone veste doufike": "Il Demone Veste Double",
  "gioubentus fc": "Giobentus FC",
  "fc mano de dios": "FC Mano de Dios",
  "fc ettanera": "FC Ettanera",
  "fc san patrignano calcio": "FC San Patrignano Calcio",
  "aston vigna": "Aston Vigna",
  "parmareggio": "Parmareggio",
  "real milano": "Real Milano",
};

function normalizeTeamName(raw) {
  if (!raw) return null;
  const canonical = TEAM_ALIASES[raw.trim().toLowerCase()];
  return canonical ?? null;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      out[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

const GIORNATA_HEADER_RE = /^(\d+)ª\s*Giornata\s*lega$/i;

function parseCalendar(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["Calendario"] ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  // fixtures: { matchday: number, home: string, away: string }[]
  const fixtures = [];
  let leftMatchday = null;
  let rightMatchday = null;

  for (const row of rows) {
    const leftHeaderMatch = typeof row[0] === "string" ? row[0].match(GIORNATA_HEADER_RE) : null;
    const rightHeaderMatch = typeof row[6] === "string" ? row[6].match(GIORNATA_HEADER_RE) : null;

    if (leftHeaderMatch || rightHeaderMatch) {
      leftMatchday = leftHeaderMatch ? Number(leftHeaderMatch[1]) : null;
      rightMatchday = rightHeaderMatch ? Number(rightHeaderMatch[1]) : null;
      continue;
    }

    if (leftMatchday == null && rightMatchday == null) continue; // before first header

    const leftHome = row[0];
    const leftAway = row[3];
    const rightHome = row[6];
    const rightAway = row[9];

    if (leftMatchday != null && typeof leftHome === "string" && typeof leftAway === "string") {
      fixtures.push({ matchday: leftMatchday, home: leftHome, away: leftAway });
    }
    if (rightMatchday != null && typeof rightHome === "string" && typeof rightAway === "string") {
      fixtures.push({ matchday: rightMatchday, home: rightHome, away: rightAway });
    }
  }

  return fixtures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Uso: node scripts/import-calendar.mjs --file <xlsx> --season <name> --year <year>");
    process.exit(1);
  }
  const seasonName = args.season ?? "DFML 26/27";
  const seasonYear = Number(args.year ?? 2026);

  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("POSTGRES_URL o DATABASE_URL richiesto");
  const sql = postgres(connectionString, { ssl: "require" });

  try {
    const rawFixtures = parseCalendar(args.file);
    console.log(`Calendario: ${rawFixtures.length} partite lette dal file.`);

    const seasonRows = await sql`select id from seasons where name = ${seasonName} and year = ${seasonYear} limit 1`;
    if (!seasonRows[0]) {
      throw new Error(`Stagione "${seasonName}" (${seasonYear}) non trovata. Importa prima listone/rose.`);
    }
    const seasonId = seasonRows[0].id;

    const rosterRows = await sql`select id, name from rosters where season_id = ${seasonId}`;
    const rosterByName = new Map(rosterRows.map((r) => [r.name, r.id]));

    let inserted = 0;
    let skippedExisting = 0;
    const unresolved = [];

    for (const fixture of rawFixtures) {
      const homeName = normalizeTeamName(fixture.home);
      const awayName = normalizeTeamName(fixture.away);
      const rosterIdHome = homeName ? rosterByName.get(homeName) : null;
      const rosterIdAway = awayName ? rosterByName.get(awayName) : null;

      if (!rosterIdHome || !rosterIdAway) {
        unresolved.push(fixture);
        continue;
      }

      const result = await sql`
        insert into matchday_fixtures (season_id, matchday_number, roster_id_home, roster_id_away)
        values (${seasonId}, ${fixture.matchday}, ${rosterIdHome}, ${rosterIdAway})
        on conflict (season_id, matchday_number, roster_id_home, roster_id_away) do nothing
        returning id
      `;
      if (result[0]) inserted += 1;
      else skippedExisting += 1;
    }

    console.log(`Partite inserite: ${inserted}`);
    console.log(`Già presenti (invariate): ${skippedExisting}`);
    if (unresolved.length) {
      console.warn("Squadre non riconosciute per queste partite (aggiungi un alias in TEAM_ALIASES):", unresolved);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Import calendario fallito:", err);
  process.exit(1);
});
