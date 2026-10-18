type Entry<T> = { expiresAt: number; value: Promise<T> };

const store = new Map<string, Entry<unknown>>();

/**
 * Per-instance memo with a TTL and in-flight de-duplication: concurrent
 * callers share one promise, and a rejected load is dropped immediately so a
 * transient failure (expired token, upstream 5xx) is never cached. Lives in
 * module scope, so it survives across requests on a warm serverless
 * instance — enough to collapse the burst of identical upstream calls one
 * page load fans out into, without any shared infrastructure.
 */
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const value = load().catch((err) => {
    if (store.get(key)?.value === value) store.delete(key);
    throw err;
  });
  store.set(key, { expiresAt: now + ttlMs, value });
  return value;
}

export function invalidateCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
