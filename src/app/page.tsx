"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../lib/i18n";
import { SectionCard } from "../components/section-card";
import { LiveMatchesFeed } from "../components/live-matches-feed";
import { MatchdayFixturesCard } from "../components/matchday-fixtures-card";

type Season = { id: string; name: string; status: string };
type Participant = { id: string; seasonId: string };
type StandingRow = { rosterId: string; rosterName: string | null; points: number };
type PlayerStat = { fullName: string; totalScore: number };
type Fixture = {
  id: string;
  homeName: string | null;
  awayName: string | null;
  goalsHome: number | null;
  goalsAway: number | null;
  status: string;
};

export default function Home() {
  const { t } = useTranslation();
  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [topPlayerName, setTopPlayerName] = useState<string | null>(null);
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [matchday, setMatchday] = useState<number | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then(async (seasons: Season[]) => {
        const active = seasons.find((s) => s.status === "active") ?? seasons[0];
        if (!active) return;
        setSeasonId(active.id);

        const [participants, standings, stats] = await Promise.all([
          fetch("/api/participants")
            .then((res) => res.json())
            .then((rows: Participant[]) => rows.filter((p) => p.seasonId === active.id)),
          fetch(`/api/standings?seasonId=${active.id}`).then((res) => res.json()) as Promise<StandingRow[]>,
          fetch(`/api/players/stats?seasonId=${active.id}`).then((res) => res.json()) as Promise<PlayerStat[]>,
          fetch(`/api/fixtures/current-matchday?seasonId=${active.id}`)
            .then((res) => res.json())
            .then((data: { matchday: number }) => setMatchday(data.matchday)),
        ]);

        setParticipantsCount(participants.length);
        setLeaderName(standings[0]?.rosterName ?? null);
        const topScorer = [...stats].sort((a, b) => b.totalScore - a.totalScore)[0];
        setTopPlayerName(topScorer && topScorer.totalScore > 0 ? topScorer.fullName : null);
      });
  }, []);

  useEffect(() => {
    if (!seasonId || !matchday) return;
    fetch(`/api/fixtures?seasonId=${seasonId}&matchdayNumber=${matchday}`)
      .then((res) => res.json())
      .then(setFixtures);
  }, [seasonId, matchday]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-alt)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--azure)]">
              {t("DFML Tracker")}
            </p>
            <h1 className="mt-2 font-display text-xl font-semibold text-[var(--ink)] md:text-3xl">
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
            { label: t("Best player"), value: topPlayerName ?? "—" },
            { label: t("League leader"), value: leaderName ?? "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{item.label}</p>
              <p className="mt-2 font-mono-data text-2xl font-semibold text-[var(--ink)]">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <LiveMatchesFeed matchday={matchday} />

      <MatchdayFixturesCard matchday={matchday} fixtures={fixtures} />
    </div>
  );
}
