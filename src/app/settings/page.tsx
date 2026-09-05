"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";

type SettingsData = { legheAppKey: string | null; legheAuthToken: string | null };

function formatLockout(lockedUntil: number, t: (key: string) => string): string {
  const seconds = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  const minutes = Math.ceil(seconds / 60);
  return `${t("Try again in")} ${minutes} ${t("min")}`;
}

export default function SettingsPage() {
  const { t } = useTranslation();

  // `null` = not checked yet, `false` = needs the password modal, `true` = in.
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [data, setData] = useState<SettingsData | null>(null);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [legheAppKey, setLegheAppKey] = useState("");
  const [legheAuthToken, setLegheAuthToken] = useState("");
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function loadSettings() {
    fetch("/api/settings")
      .then(async (res) => {
        if (res.status === 401) {
          setAuthorized(false);
          return;
        }
        const body: SettingsData = await res.json();
        setData(body);
        setLegheAppKey(body.legheAppKey ?? "");
        setLegheAuthToken(body.legheAuthToken ?? "");
        setAuthorized(true);
      })
      .catch(() => setAuthorized(false));
  }

  useEffect(loadSettings, []);

  // Re-check lockout expiry client-side so the modal unlocks itself once the
  // countdown ends, without needing another failed attempt to notice.
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= lockedUntil) setLockedUntil(null);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    const res = await fetch("/api/settings/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await res.json();
    setLoggingIn(false);
    if (res.ok) {
      setPassword("");
      loadSettings();
      return;
    }
    if (res.status === 429) {
      setLockedUntil(body.lockedUntil);
      setLoginError(body.error);
    } else {
      setLoginError(`${body.error} (${body.attemptsRemaining} ${t("attempts left")})`);
    }
    setPassword("");
  }

  async function handleLogout() {
    await fetch("/api/settings/logout", { method: "POST" });
    setAuthorized(false);
    setData(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legheAppKey, legheAuthToken }),
    });
    setSaving(false);
    if (res.status === 401) {
      setAuthorized(false);
      return;
    }
    if (res.ok) setSaved(true);
  }

  return (
    <ModuleShell title={t("Settings")} description={t("leghe.fantacalcio.it credentials, updated without a redeploy.")}>
      <SectionCard title={t("leghe.fantacalcio.it credentials")} description={t("Used for calendar, formations, results and listone sync.")}>
        {!data ? (
          <p className="text-sm text-ink-muted">{authorized === false ? t("Locked — enter the password to view.") : `${t("Loading")}...`}</p>
        ) : (
          <form className="grid gap-5" onSubmit={handleSave}>
            <label className="block space-y-2 text-sm text-ink">
              <span>App_Key</span>
              <div className="flex items-center gap-2">
                <input
                  type={showAppKey ? "text" : "password"}
                  value={legheAppKey}
                  onChange={(event) => {
                    setLegheAppKey(event.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
                />
                <button
                  type="button"
                  onClick={() => setShowAppKey((v) => !v)}
                  className="shrink-0 rounded-xl border border-line p-3 text-ink-muted transition hover:bg-surface-alt"
                >
                  {showAppKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="block space-y-2 text-sm text-ink">
              <span>Authorization</span>
              <div className="flex items-center gap-2">
                <input
                  type={showAuthToken ? "text" : "password"}
                  value={legheAuthToken}
                  onChange={(event) => {
                    setLegheAuthToken(event.target.value);
                    setSaved(false);
                  }}
                  className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthToken((v) => !v)}
                  className="shrink-0 rounded-xl border border-line p-3 text-ink-muted transition hover:bg-surface-alt"
                >
                  {showAuthToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
              >
                {saving ? t("Saving") + "..." : t("Save")}
              </button>
              {saved && <span className="text-sm font-medium text-emerald-600">{t("Saved")}</span>}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-auto text-sm font-medium text-ink-muted transition hover:text-ink"
              >
                {t("Log out")}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {authorized === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 text-ink">
              <Lock size={18} />
              <h3 className="text-lg font-semibold">{t("Protected page")}</h3>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{t("Enter the settings password to continue.")}</p>

            <label className="mt-4 block space-y-2 text-sm text-ink">
              <span>{t("Password")}</span>
              <input
                type="password"
                autoFocus
                required
                disabled={!!lockedUntil}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20 disabled:opacity-60"
              />
            </label>

            {loginError && !lockedUntil && (
              <p className="mt-2 text-xs font-medium text-rose-600">{loginError}</p>
            )}
            {lockedUntil && (
              <p className="mt-2 text-xs font-medium text-rose-600">{formatLockout(lockedUntil, t)}</p>
            )}

            <button
              type="submit"
              disabled={loggingIn || !!lockedUntil}
              className="mt-4 w-full rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
            >
              {loggingIn ? t("Checking") + "..." : t("Unlock")}
            </button>
          </form>
        </div>
      )}
    </ModuleShell>
  );
}
