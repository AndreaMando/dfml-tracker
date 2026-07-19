"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Sparkles,
  ClipboardList,
  ShoppingCart,
  HeartHandshake,
  BadgeDollarSign,
  CircleDollarSign,
  History,
  Languages,
} from "lucide-react";
import { useTranslation } from "../lib/i18n";

const navigation = [
  { href: "/", labelKey: "Dashboard", icon: LayoutDashboard },
  { href: "/seasons", labelKey: "Seasons", icon: Sparkles },
  { href: "/participants", labelKey: "Participants", icon: Users },
  { href: "/players", labelKey: "Players", icon: Trophy },
  { href: "/rosters", labelKey: "Rosters", icon: ClipboardList },
  { href: "/lineups", labelKey: "Lineups", icon: HeartHandshake },
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
  marketStatus?: string;
};

function Ticker({
  matchday = 6,
  seasonLabel = "DFML 26/27",
  participantsCount = 6,
  marketStatus = "MERCATO CHIUSO",
}: TickerProps) {
  const { t } = useTranslation();
  const items = [
    `${t("MATCHDAY")} ${matchday}`,
    seasonLabel,
    `${participantsCount} ${t("PARTICIPANTS")}`,
    marketStatus,
  ];

  return (
    <div className="w-full bg-[var(--azure-deep)] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 font-mono-data text-xs uppercase tracking-[0.18em] lg:px-6">
        {items.map((item, i) => (
          <span key={item} className="flex items-center gap-3">
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

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Ticker />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:w-64">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--azure)]">
                DFML
              </p>
              <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                {t("DFML Tracker")}
              </h2>
            </div>
          </div>

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
        </aside>

        <main className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
