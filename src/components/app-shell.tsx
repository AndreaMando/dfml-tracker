"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Sparkles,
  ClipboardList,
  ShoppingCart,
  Goal,
  CircleDollarSign,
  History,
  Languages,
  ChevronDown,
  Settings,
} from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { fetchJsonShared } from "../lib/fetch-json";

const navigation = [
  { href: "/", labelKey: "Dashboard", icon: LayoutDashboard },
  { href: "/seasons", labelKey: "Seasons", icon: Sparkles },
  { href: "/participants", labelKey: "Participants", icon: Users },
  { href: "/players", labelKey: "Players", icon: Trophy },
  { href: "/rosters", labelKey: "Rosters", icon: ClipboardList },
  { href: "/market", labelKey: "Market & Trades", icon: ShoppingCart },
  { href: "/scores", labelKey: "Results", icon: Goal },
  { href: "/standings", labelKey: "Standings", icon: Trophy },
  { href: "/finance", labelKey: "Finance & Penalties", icon: CircleDollarSign },
  { href: "/history", labelKey: "History", icon: History },
  { href: "/settings", labelKey: "Settings", icon: Settings },
];

type TickerProps = {
  matchday?: number;
  seasonLabel?: string;
  participantsCount?: number;
  marketOpen?: boolean;
};

function Ticker({ matchday, seasonLabel, participantsCount, marketOpen }: TickerProps) {
  const { t } = useTranslation();
  const items = [
    matchday !== undefined ? `${t("MATCHDAY")} ${matchday}` : null,
    seasonLabel ?? null,
    participantsCount !== undefined ? `${participantsCount} ${t("PARTICIPANTS")}` : null,
    marketOpen !== undefined ? t(marketOpen ? "MARKET OPEN" : "MARKET CLOSED") : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="w-full bg-[var(--azure-deep)] text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-x-2.5 overflow-x-auto whitespace-nowrap px-4 py-2 font-mono-data text-[11px] uppercase tracking-wide sm:text-xs sm:tracking-[0.18em] lg:px-6">
        {items.map((item, i) => (
          <span key={item} className="flex shrink-0 items-center gap-2.5">
            {item}
            {i < items.length - 1 && <span className="text-white/30">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang, setLang } = useTranslation();
  const [ticker, setTicker] = useState<TickerProps>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // True while leghe.fantacalcio.it rejects our stored session token — sync
  // silently stops in that case, so say it out loud instead of letting the
  // site look frozen.
  const [legheTokenExpired, setLegheTokenExpired] = useState(false);

  useEffect(() => {
    function checkLeghe() {
      fetch("/api/leghe/status")
        .then((res) => res.json())
        .then((status: { ok: boolean; reason?: string }) => setLegheTokenExpired(!status.ok && status.reason === "auth"))
        .catch(() => null);
    }
    checkLeghe();
    const interval = setInterval(checkLeghe, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  const activeItem = navigation.find(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function loadTicker() {
      fetchJsonShared<{ id: string; name: string; status: string }[]>("/api/seasons")
        .then(async (seasons) => {
          const active = seasons.find((s) => s.status === "active") ?? seasons[0];
          if (!active) return;

          const [participants, currentMatchday, marketSessions] = await Promise.all([
            fetchJsonShared<{ seasonId: string }[]>(`/api/participants?seasonId=${active.id}`),
            fetchJsonShared<{ matchday: number }>(`/api/fixtures/current-matchday?seasonId=${active.id}`),
            fetchJsonShared<{ startDate: string | null; endDate: string | null }[]>(
              `/api/market?seasonId=${active.id}`
            ),
          ]);

          const matchday = currentMatchday.matchday;

          const now = Date.now();
          const marketOpen = marketSessions.some((s) => {
            if (!s.startDate || !s.endDate) return false;
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            return now >= start && now <= end;
          });

          setTicker({
            matchday,
            seasonLabel: active.name,
            participantsCount: participants.length,
            marketOpen,
          });
        });
    }

    // AppShell stays mounted across client-side navigations (it's in the
    // root layout), so a mount-only fetch never sees a market session
    // created after the first load. Refresh on every navigation, plus a
    // periodic poll in case the user stays on one page (e.g. Market) after
    // opening/closing a session there.
    loadTicker();
    const interval = setInterval(loadTicker, 60_000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Ticker {...ticker} />

      {legheTokenExpired && (
        <div role="alert" className="w-full bg-rose-700 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm lg:px-6">
            <span>{t("Data sync paused: the leghe.fantacalcio.it token expired.")}</span>
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              {t("Update it in Settings")}
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:w-64">
          <div className="flex items-center justify-between gap-3">
            <div className="hidden w-full lg:block">
              <Image
                src="/dfml-lockup.png"
                alt=""
                // P3: 2× the display size for Retina sharpness
                width={280}
                height={280}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                priority
              />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-[var(--azure-deep)] lg:hidden">
              DFML
            </span>
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] lg:hidden"
            >
              {activeItem && <activeItem.icon size={16} />}
              <span>{activeItem ? t(activeItem.labelKey) : t("Menu")}</span>
              <ChevronDown
                size={16}
                className={`transition ${mobileNavOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <div className={`${mobileNavOpen ? "block" : "hidden"} lg:block`}>
            <nav className="mt-6 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-[var(--azure)] text-white"
                        : "text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                <Languages size={14} />
                <span>{t("Language")}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                    lang === "en"
                      ? "bg-[var(--azure-soft)] text-[var(--azure-deep)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
                  }`}
                  onClick={() => setLang("en")}
                >
                  {t("English")}
                </button>
                <button
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                    lang === "it"
                      ? "bg-[var(--azure-soft)] text-[var(--azure-deep)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
                  }`}
                  onClick={() => setLang("it")}
                >
                  {t("Italian")}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
