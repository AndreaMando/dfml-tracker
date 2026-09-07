"use client";

import { useEffect, useState } from "react";
import type { LiveMatch } from "../app/api/live-matches/route";

export type { LiveMatch };

const POLL_MS = 30_000;
// Same-matchday requests within this window share one in-flight fetch and
// its result — a lightweight SWR-style dedupingInterval without adding the
// dependency, matching this project's otherwise dependency-free approach.
const DEDUPE_MS = 30_000;

type CacheEntry = { data: LiveMatch[]; fetchedAt: number; promise: Promise<LiveMatch[]> | null };
const cache = new Map<number, CacheEntry>();

async function fetchMatches(matchday: number): Promise<LiveMatch[]> {
  const res = await fetch(`/api/live-matches?matchday=${matchday}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function getMatches(matchday: number): Promise<LiveMatch[]> {
  const entry = cache.get(matchday);
  if (entry?.promise) return entry.promise;
  if (entry && Date.now() - entry.fetchedAt < DEDUPE_MS) return Promise.resolve(entry.data);

  const promise = fetchMatches(matchday)
    .then((data) => {
      cache.set(matchday, { data, fetchedAt: Date.now(), promise: null });
      return data;
    })
    .catch((err) => {
      cache.delete(matchday);
      throw err;
    });
  cache.set(matchday, { data: entry?.data ?? [], fetchedAt: entry?.fetchedAt ?? 0, promise });
  return promise;
}

/** Polls /api/live-matches for `matchday` every 30s. `matchday` is expected to already be computed by the caller. */
export function useLiveMatches(matchday: number | null) {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchday) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    function load() {
      getMatches(matchday as number)
        .then((data) => {
          if (cancelled) return;
          setMatches(data);
          setError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Errore nel caricamento delle partite");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }

    setIsLoading(true);
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchday]);

  return { matches, isLoading, error };
}
