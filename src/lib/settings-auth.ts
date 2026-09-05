import { createHmac, timingSafeEqual } from "crypto";
import { getAppSetting, setAppSetting } from "./app-settings";

export const SETTINGS_COOKIE_NAME = "dfml_settings_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
export const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

const ATTEMPTS_KEY = "settings_failed_attempts";
const LOCKED_UNTIL_KEY = "settings_locked_until";

function sign(expiresAt: number): string {
  const secret = process.env.SETTINGS_SESSION_SECRET;
  if (!secret) throw new Error("SETTINGS_SESSION_SECRET non configurato");
  return createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
}

/** Signed `expiresAt.hmac` session token — no DB round trip needed to verify it. */
export function createSessionToken(): { token: string; maxAgeSeconds: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return { token: `${expiresAt}.${sign(expiresAt)}`, maxAgeSeconds: SESSION_TTL_MS / 1000 };
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = Buffer.from(sign(expiresAt));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.SETTINGS_PASSWORD;
  if (!expected) return false;
  const expectedBuf = Buffer.from(expected);
  const inputBuf = Buffer.from(input);
  if (expectedBuf.length !== inputBuf.length) return false;
  return timingSafeEqual(expectedBuf, inputBuf);
}

// Lockout state lives in the DB (appSettings), not in memory — a serverless
// function has no shared memory across invocations/instances.
export async function getLockoutState(): Promise<{ lockedUntil: number | null; attempts: number }> {
  const [lockedUntilRaw, attemptsRaw] = await Promise.all([
    getAppSetting(LOCKED_UNTIL_KEY),
    getAppSetting(ATTEMPTS_KEY),
  ]);
  const lockedUntil = lockedUntilRaw ? Number(lockedUntilRaw) : null;
  return {
    lockedUntil: lockedUntil && lockedUntil > Date.now() ? lockedUntil : null,
    attempts: attemptsRaw ? Number(attemptsRaw) : 0,
  };
}

export async function registerFailedAttempt(): Promise<{ lockedUntil: number | null; attemptsRemaining: number }> {
  const { attempts } = await getLockoutState();
  const next = attempts + 1;
  if (next >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_MS;
    await Promise.all([setAppSetting(ATTEMPTS_KEY, "0"), setAppSetting(LOCKED_UNTIL_KEY, String(lockedUntil))]);
    return { lockedUntil, attemptsRemaining: 0 };
  }
  await setAppSetting(ATTEMPTS_KEY, String(next));
  return { lockedUntil: null, attemptsRemaining: MAX_LOGIN_ATTEMPTS - next };
}

export async function clearFailedAttempts(): Promise<void> {
  await Promise.all([setAppSetting(ATTEMPTS_KEY, "0"), setAppSetting(LOCKED_UNTIL_KEY, "0")]);
}
