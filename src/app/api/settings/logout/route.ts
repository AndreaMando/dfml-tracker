import { NextResponse } from "next/server";
import { SETTINGS_COOKIE_NAME } from "../../../../lib/settings-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SETTINGS_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
