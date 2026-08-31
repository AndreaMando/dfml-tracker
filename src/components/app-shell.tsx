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
  BadgeDollarSign,
  CircleDollarSign,
  History,
  Languages,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "../lib/i18n";

const navigation = [
  { href: "/", labelKey: "Dashboard", icon: LayoutDashboard },
  { href: "/seasons", labelKey: "Seasons", icon: Sparkles },
  { href: "/participants", labelKey: "Participants", icon: Users },
  { href: "/players", labelKey: "Players", icon: Trophy },
  { href: "/rosters", labelKey: "Rosters", icon: ClipboardList },
  { href: "/market", labelKey: "Market", icon: ShoppingCart },
  { href: "/scores", labelKey: "Scores", icon: BadgeDollarSign },
  { href: "/standings", labelKey: "Standings", icon: Trophy },
  { href: "/finance", labelKey: "Finance", icon: CircleDollarSign },
  { href: "/history", labelKey: "History", icon: History },
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

  const activeItem = navigation.find(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then(async (seasons: { id: string; name: string; status: string }[]) => {
        const active = seasons.find((s) => s.status === "active") ?? seasons[0];
        if (!active) return;

        const [participants, currentMatchday, marketSessions] = await Promise.all([
          fetch("/api/participants")
            .then((res) => res.json())
            .then((rows: { seasonId: string }[]) => rows.filter((r) => r.seasonId === active.id)),
          fetch(`/api/fixtures/current-matchday?seasonId=${active.id}`).then((res) => res.json()) as Promise<{
            matchday: number;
          }>,
          fetch(`/api/market?seasonId=${active.id}`).then((res) => res.json()) as Promise<
            { startDate: string | null; endDate: string | null }[]
          >,
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
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Ticker {...ticker} />

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
