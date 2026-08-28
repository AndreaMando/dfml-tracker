"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  History,
  ShoppingCart,
  Sparkles,
  Trophy,
  Users,
  ClipboardList,
} from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { SectionCard } from "../components/section-card";

const endpoints = [
  { labelKey: "Seasons", href: "/seasons", icon: Sparkles },
  { labelKey: "Participants", href: "/participants", icon: Users },
  { labelKey: "Players", href: "/players", icon: Trophy },
  { labelKey: "Rosters", href: "/rosters", icon: ClipboardList },
  { labelKey: "Market", href: "/market", icon: ShoppingCart },
  { labelKey: "Scores", href: "/scores", icon: BarChart3 },
  { labelKey: "Standings", href: "/standings", icon: Trophy },
  { labelKey: "Finance", href: "/finance", icon: CircleDollarSign },
  { labelKey: "History", href: "/history", icon: History },
];

type Season = { id: string; name: string; status: string };
type Participant = { id: string; seasonId: string };
type StandingRow = { rosterId: string; rosterName: string | null; points: number };

export default function Home() {
  const { t } = useTranslation();
  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [playersCount, setPlayersCount] = useState<number | null>(null);
  const [leaderName, setLeaderName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((rows: unknown[]) => setPlayersCount(rows.length));

    fetch("/api/seasons")
      .then((res) => res.json())
      .then(async (seasons: Season[]) => {
        const active = seasons.find((s) => s.status === "active") ?? seasons[0];
        if (!active) return;

        const [participants, standings] = await Promise.all([
          fetch("/api/participants")
            .then((res) => res.json())
            .then((rows: Participant[]) => rows.filter((p) => p.seasonId === active.id)),
          fetch(`/api/standings?seasonId=${active.id}`).then((res) => res.json()) as Promise<StandingRow[]>,
        ]);

        setParticipantsCount(participants.length);
        setLeaderName(standings[0]?.rosterName ?? null);
      });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-alt)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--azure)]">
              {t("DFML Tracker")}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--ink)] md:text-3xl">
              {t("Companion dashboard for seasons, rosters and matchday flow.")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)]">
              {t(
                "Manage your league with a clean overview of seasons, participants, rosters, stats and market activity."
              )}
            </p>
          </div>
        </div>
      </section>

      <SectionCard title={t("Season summary")} description={t("Overview of the current season")}>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: t("Active participants"), value: participantsCount?.toString() ?? "—" },
            { label: t("Registered players"), value: playersCount?.toString() ?? "—" },
            { label: t("League leader"), value: leaderName ?? "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{item.label}</p>
              <p className="mt-2 font-mono-data text-2xl font-semibold text-[var(--ink)]">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {endpoints.map((endpoint) => {
          const Icon = endpoint.icon;
          return (
            <Link
              key={endpoint.href}
              href={endpoint.href}
              className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--azure)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-lg bg-[var(--azure-soft)] p-2 text-[var(--azure-deep)]">
                  <Icon size={18} />
                </div>
                <ArrowRight
                  size={16}
                  className="text-[var(--line)] transition group-hover:text-[var(--azure)]"
                />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-[var(--ink)]">
                {t(endpoint.labelKey)}
              </h3>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
