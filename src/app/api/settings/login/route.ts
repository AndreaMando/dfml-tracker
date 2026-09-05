import { NextResponse } from "next/server";
import {
  MAX_LOGIN_ATTEMPTS,
  SETTINGS_COOKIE_NAME,
  checkPassword,
  clearFailedAttempts,
  createSessionToken,
  getLockoutState,
  registerFailedAttempt,
} from "../../../../lib/settings-auth";
import { settingsLoginSchema } from "../../../../lib/schemas";
import { parseJsonBody } from "../../../../lib/validate";

export async function POST(request: Request) {
  const { lockedUntil } = await getLockoutState();
  if (lockedUntil) {
    return NextResponse.json(
      { error: "Troppi tentativi falliti", lockedUntil },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, settingsLoginSchema);
  if ("response" in parsed) return parsed.response;

  if (!checkPassword(parsed.data.password)) {
    const result = await registerFailedAttempt();
    if (result.lockedUntil) {
      return NextResponse.json(
        { error: "Password errata. Troppi tentativi, riprova più tardi.", lockedUntil: result.lockedUntil },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error: "Password errata",
        attemptsRemaining: result.attemptsRemaining,
      },
      { status: 401 }
    );
  }

  await clearFailedAttempts();
  const { token, maxAgeSeconds } = createSessionToken();
  const response = NextResponse.json({ ok: true, maxAttempts: MAX_LOGIN_ATTEMPTS });
  response.cookies.set(SETTINGS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return response;
}
