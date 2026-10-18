const inFlight = new Map<string, Promise<unknown>>();

/**
 * GET + JSON with in-flight de-duplication: callers asking for the same URL
 * while a request is still pending share one network call. The entry is
 * dropped the moment it settles, so nothing is ever served stale — it only
 * collapses the duplicate fetches that the sidebar ticker and the page
 * itself fire at the same instant on every navigation.
 */
export function fetchJsonShared<T>(url: string): Promise<T> {
  const existing = inFlight.get(url) as Promise<T> | undefined;
  if (existing) return existing;

  const request = fetch(url)
    .then((res) => res.json() as Promise<T>)
    .finally(() => inFlight.delete(url));
  inFlight.set(url, request);
  return request;
}
