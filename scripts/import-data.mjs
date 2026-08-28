// One-off / repeatable bulk import for DFML Tracker.
//
// Usage:
//   node scripts/import-data.mjs --players "<path-to-listone.xlsx>" --rosters "<path-to-rose.csv>" --season "DFML 26/27" --year 2026
//
// Idempotent: safe to re-run. Players are upserted on external_id, participants on
// (season_id, display_name), rosters on (season_id, participant_id), roster_players on
// (roster_id, player_id).

import dotenv from "dotenv";
import fs from "node:fs";
import postgres from "postgres";
import XLSX from "xlsx";

dotenv.config({ path: ".env.local" });

const INITIAL_CREDITS = 500;
const ROSTER_SIZE = 25;

const POSITION_MAP = { P: "GK", D: "DF", C: "MF", A: "FW" };

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

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseListone(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["Tutti"];
  if (!sheet) {
    throw new Error(`Foglio "Tutti" non trovato in ${filePath}`);
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  // rows[0] = title, rows[1] = header, rows[2..] = data
  return rows
    .slice(2)
    .filter((r) => r[0] != null && r[3])
    .map((r) => ({
      externalId: String(r[0]),
      role: r[1],
      fullName: String(r[3]).trim(),
      teamName: r[4] ? String(r[4]).trim() : null,
      currentValue: r[5] ?? null,
      initialValue: r[6] ?? null,
      fvm: r[11] ?? null,
    }));
}

function parseRosters(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const teams = new Map();
  for (const line of lines) {
    const [team, id, price] = line.split(",").map((s) => s.trim());
    if (!team || team === "$") continue;
    if (!teams.has(team)) teams.set(team, []);
    teams.get(team).push({ externalId: id, price: Number(price) });
  }
  return teams;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.players || !args.rosters) {
    console.error("Uso: node scripts/import-data.mjs --players <xlsx> --rosters <csv> --season <name> --year <year>");
    process.exit(1);
  }
  const seasonName = args.season ?? "DFML 26/27";
  const seasonYear = Number(args.year ?? 2026);

  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("POSTGRES_URL o DATABASE_URL richiesto");
  const sql = postgres(connectionString, { ssl: "require" });

  try {
    const players = parseListone(args.players);
    const teams = parseRosters(args.rosters);
    console.log(`Listone: ${players.length} giocatori. Rose: ${teams.size} fantasquadre.`);

    await sql.begin(async (tx) => {
      // 1. Season
      const existingSeason = await tx`
        select id from seasons where name = ${seasonName} and year = ${seasonYear} limit 1
      `;
      let seasonId = existingSeason[0]?.id;
      if (!seasonId) {
        const inserted = await tx`
          insert into seasons (name, year, status, start_date, end_date)
          values (${seasonName}, ${seasonYear}, 'active', '2026-09-01', '2027-06-30')
          returning id
        `;
        seasonId = inserted[0].id;
        console.log(`Creata stagione ${seasonName} (${seasonId})`);
      } else {
        console.log(`Stagione ${seasonName} già esistente (${seasonId})`);
      }

      // 2. League settings
      await tx`
        insert into league_settings (season_id, initial_credits, roster_size)
        values (${seasonId}, ${INITIAL_CREDITS}, ${ROSTER_SIZE})
        on conflict (season_id) do update set
          initial_credits = excluded.initial_credits,
          roster_size = excluded.roster_size
      `;

      // 3. Players (listone)
      let playersUpserted = 0;
      for (const p of players) {
        const position = POSITION_MAP[p.role] ?? null;
        if (!position) {
          console.warn(`Ruolo sconosciuto "${p.role}" per ${p.fullName}, saltato`);
          continue;
        }
        await tx`
          insert into players (external_id, full_name, position, team_name, current_value, initial_value, fvm, status)
          values (${p.externalId}, ${p.fullName}, ${position}, ${p.teamName}, ${p.currentValue}, ${p.initialValue}, ${p.fvm}, 'active')
          on conflict (external_id) do update set
            full_name = excluded.full_name,
            position = excluded.position,
            team_name = excluded.team_name,
            current_value = excluded.current_value,
            initial_value = excluded.initial_value,
            fvm = excluded.fvm,
            status = 'active'
        `;
        playersUpserted += 1;
      }
      console.log(`Giocatori upsertati: ${playersUpserted}`);

      // 4. Teams -> participants + rosters + roster_players
      let teamsUpserted = 0;
      let rosterPlayersUpserted = 0;
      const missingPlayers = [];
      for (const [teamName, entries] of teams) {
        const spent = entries.reduce((sum, e) => sum + (Number.isFinite(e.price) ? e.price : 0), 0);
        const creditsRemaining = INITIAL_CREDITS - spent;
        const userId = slugify(teamName) || teamName;

        const participantRows = await tx`
          insert into participants (season_id, user_id, display_name, team_name, is_active)
          values (${seasonId}, ${userId}, ${teamName}, ${teamName}, true)
          on conflict (season_id, display_name) do update set
            team_name = excluded.team_name
          returning id
        `;
        const participantId = participantRows[0].id;

        const rosterRows = await tx`
          insert into rosters (season_id, participant_id, name, credits_remaining)
          values (${seasonId}, ${participantId}, ${teamName}, ${creditsRemaining})
          on conflict (season_id, participant_id) do update set
            name = excluded.name,
            credits_remaining = excluded.credits_remaining
          returning id
        `;
        const rosterId = rosterRows[0].id;
        teamsUpserted += 1;

        for (const entry of entries) {
          const playerRows = await tx`
            select id from players where external_id = ${entry.externalId} limit 1
          `;
          if (!playerRows[0]) {
            missingPlayers.push({ team: teamName, externalId: entry.externalId });
            continue;
          }
          await tx`
            insert into roster_players (roster_id, player_id, season_id, acquired_at, acquisition_price, is_active)
            values (${rosterId}, ${playerRows[0].id}, ${seasonId}, now(), ${entry.price}, true)
            on conflict (roster_id, player_id) do update set
              acquisition_price = excluded.acquisition_price,
              is_active = true
          `;
          rosterPlayersUpserted += 1;
        }
      }

      console.log(`Fantasquadre upsertate: ${teamsUpserted}`);
      console.log(`Righe rosa (roster_players) upsertate: ${rosterPlayersUpserted}`);
      if (missingPlayers.length) {
        console.warn("Giocatori non trovati nel listone per questi ID:", missingPlayers);
      }
    });

    console.log("Import completato.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Import fallito:", err);
  process.exit(1);
});
