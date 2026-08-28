import * as cheerio from "cheerio";

export type ScrapedPlayerStats = {
  externalId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  vote: number | null;
  goals: number;
  assists: number;
  ownGoals: number;
  penaltiesScored: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
};

const ROLE_MAP: Record<string, ScrapedPlayerStats["position"]> = {
  p: "GK",
  d: "DF",
  c: "MF",
  a: "FW",
};

const BONUS_TITLE_MAP: Record<string, keyof ScrapedPlayerStats> = {
  "Gol segnati": "goals",
  "Gol subiti": "goalsConceded",
  "Autoreti": "ownGoals",
  "Rigori segnati": "penaltiesScored",
  "Rigori sbagliati": "penaltiesMissed",
  "Rigori parati": "penaltiesSaved",
  "Assist": "assists",
};

function parseItalianNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Scrapes the public (no-login) "voti-fantacalcio-serie-a" page for a given
 * fantacalcio.it season/matchday. Unofficial — fragile to markup changes on
 * fantacalcio.it's side, used on-demand (one fetch per import click).
 */
export async function fetchGiornataVoti(
  fantacalcioSeason: string,
  fantacalcioMatchday: number
): Promise<ScrapedPlayerStats[]> {
  const url = `https://www.fantacalcio.it/voti-fantacalcio-serie-a/${fantacalcioSeason}/${fantacalcioMatchday}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`Fantacalcio.it ha risposto ${res.status} per ${url}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const results: ScrapedPlayerStats[] = [];

  $(".player-item").each((_, el) => {
    const item = $(el);
    const link = item.find("a.player-name");
    const href = link.attr("href") ?? "";
    // Player profile URL used to end in "/<id>/<season>" (e.g. "/4431/2025-26");
    // as of the 2026-27 season fantacalcio.it dropped the trailing season
    // segment ("/4431"). Match both: digits at the end, optionally followed
    // by one more path segment.
    const idMatch = href.match(/\/(\d+)(?:\/[^/]*)?$/);
    const externalId = idMatch?.[1];
    const fullName = link.find("span").first().text().trim() || link.text().trim();
    const roleChar = item.find(".role").attr("data-value");
    const position = roleChar ? ROLE_MAP[roleChar] : undefined;
    if (!externalId || !fullName || !position) return;

    // The player-item's parent row (<tr>) contains the vote/fanta-grade pills
    // and the bonus/malus icons as sibling <td>s.
    const row = item.closest("tr");

    const gradeSpan = row.find(".player-grade").first();
    let vote = parseItalianNumber(gradeSpan.attr("data-value"));
    // Fantacalcio.it encodes "senza voto" (didn't play / not rated) as a
    // sentinel value of 55 — well outside any real vote range (0-11ish).
    if (vote !== null && vote > 15) vote = null;
    if (vote === null) return; // skip players who didn't actually play this matchday
    const yellowCards = row.find(".player-grade.yellow-card").length > 0 ? 1 : 0;
    const redCards = row.find(".player-grade.red-card").length > 0 ? 1 : 0;

    const stats: ScrapedPlayerStats = {
      externalId,
      fullName,
      position,
      vote,
      goals: 0,
      assists: 0,
      ownGoals: 0,
      penaltiesScored: 0,
      penaltiesMissed: 0,
      penaltiesSaved: 0,
      goalsConceded: 0,
      yellowCards,
      redCards,
    };

    row.find(".player-bonus").each((__, bonusEl) => {
      const bonus = $(bonusEl);
      const title = bonus.attr("title");
      const key = title ? BONUS_TITLE_MAP[title] : undefined;
      if (!key) return;
      const value = Number(bonus.attr("data-value") ?? "0");
      if (Number.isFinite(value)) {
        (stats[key] as number) = value;
      }
    });

    results.push(stats);
  });

  return results;
}
