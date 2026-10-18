const lastRun = new Map<string, number>();

/**
 * Client-side guard for the "re-sync on page load" POSTs. Returns true (and
 * records the run) if `key` hasn't synced within `minIntervalMs`, so quickly
 * hopping between pages doesn't re-hit leghe.fantacalcio.it and rewrite the
 * database every time. Resets on a full page reload.
 */
export function shouldSync(key: string, minIntervalMs: number): boolean {
  const now = Date.now();
  const last = lastRun.get(key);
  if (last !== undefined && now - last < minIntervalMs) return false;
  lastRun.set(key, now);
  return true;
}
