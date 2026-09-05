import { NextRequest, NextResponse } from "next/server";
import { getAppSetting, setAppSetting } from "../../../lib/app-settings";
import { updateAppSettingsSchema } from "../../../lib/schemas";
import { SETTINGS_COOKIE_NAME, verifySessionToken } from "../../../lib/settings-auth";
import { parseJsonBody } from "../../../lib/validate";

function isAuthorized(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(SETTINGS_COOKIE_NAME)?.value);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const [legheAppKey, legheAuthToken] = await Promise.all([
    getAppSetting("LEGHE_APP_KEY"),
    getAppSetting("LEGHE_AUTH_TOKEN"),
  ]);
  return NextResponse.json({ legheAppKey, legheAuthToken });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const parsed = await parseJsonBody(request, updateAppSettingsSchema);
  if ("response" in parsed) return parsed.response;
  const { legheAppKey, legheAuthToken } = parsed.data;

  await Promise.all([
    legheAppKey !== undefined ? setAppSetting("LEGHE_APP_KEY", legheAppKey) : null,
    legheAuthToken !== undefined ? setAppSetting("LEGHE_AUTH_TOKEN", legheAuthToken) : null,
  ]);

  return NextResponse.json({ ok: true });
}
