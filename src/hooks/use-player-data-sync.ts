"use client";

import { useEffect, useState } from "react";
import { shouldSync } from "../lib/sync-throttle";

// The listone (prices, teams, transfers) moves slowly; votes move during a
// matchday. Both are throttled client-side so hopping between pages doesn't
// re-hit the upstream sites every time.
const LISTONE_MIN_INTERVAL_MS = 10 * 60_000;
const SCORES_MIN_INTERVAL_MS = 60_000;

type SyncSeason = { id: string; year: number } | null;

/**
 * Runs the player-data refresh that used to be a manual "Sync all" form:
 * listone (apileague.fantacalcio.it) and the current matchday's votes
 * (Fantacalcio.it), in parallel, for the league's current season/matchday.
 * Fires on mount once both are known. `listoneSyncedAt` / `scoresSyncedAt`
 * are bumped when each finishes so the caller can reload what it displays.
 */
export function usePlayerDataSync(
  season: SyncSeason,
  matchday: number | null,
  options: { listone?: boolean } = {}
) {
  const { listone = true } = options;
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [listoneSyncedAt, setListoneSyncedAt] = useState(0);
  const [scoresSyncedAt, setScoresSyncedAt] = useState(0);

  const seasonId = season?.id ?? null;
  const seasonYear = season?.year ?? null;

  useEffect(() => {
    if (!seasonId || seasonYear === null || !matchday) return;

    const runListone = listone && shouldSync("listone", LISTONE_MIN_INTERVAL_MS);
    const runScores = shouldSync(`scores-import:${seasonId}:${matchday}`, SCORES_MIN_INTERVAL_MS);
    if (!runListone && !runScores) return;

    // fantacalcio.it season string, e.g. season year 2026 -> "2026-27".
    const fantacalcioSeason = `${seasonYear}-${String((seasonYear + 1) % 100).padStart(2, "0")}`;
    setSyncing(true);
    setError("");

    async function post(url: string, body?: unknown): Promise<void> {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
    }

    const jobs: Promise<unknown>[] = [];
    if (runListone) {
      jobs.push(
        post("/api/players/sync-listone").then(
          () => setListoneSyncedAt(Date.now()),
          (err: Error) => setError(`Listone: ${err.message}`)
        )
      );
    }
    if (runScores) {
      jobs.push(
        post("/api/scores/import", {
          seasonId,
          matchdayNumber: matchday,
          fantacalcioSeason,
          fantacalcioMatchday: matchday,
        }).then(
          () => setScoresSyncedAt(Date.now()),
          (err: Error) => setError(`Voti: ${err.message}`)
        )
      );
    }
    // No cancellation guard on purpose: the throttle has already recorded
    // this run, so dropping its result (e.g. React strict-mode's double
    // effect) would leave the caller never reloading.
    Promise.all(jobs).finally(() => setSyncing(false));
  }, [seasonId, seasonYear, matchday, listone]);

  return { syncing, error, listoneSyncedAt, scoresSyncedAt };
}
