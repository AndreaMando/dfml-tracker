"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../lib/i18n";
import { fetchJsonShared } from "../lib/fetch-json";
import { usePlayerDataSync } from "../hooks/use-player-data-sync";
import { SectionCard } from "../components/section-card";
import { LiveMatchesFeed } from "../components/live-matches-feed";
import { MatchdayFixturesCard } from "../components/matchday-fixtures-card";

type Season = { id: string; name: string; status: string; year: number };
type Participant = { id: string; seasonId: string };
type StandingRow = { rosterId: string; rosterName: string | null; ownerName: string | null; points: number };
type BestPlayer = {
  playerId: string;
  fullName: string;
  teamName: string | null;
  imageUrl: string | null;
  ownerRosterName: string | null;
} | null;
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
  const [bestPlayer, setBestPlayer] = useState<BestPlayer>(null);
  const [leader, setLeader] = useState<{ teamName: string | null; ownerName: string | null } | null>(null);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [seasonYear, setSeasonYear] = useState<number | null>(null);
  const [matchday, setMatchday] = useState<number | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    fetchJsonShared<Season[]>("/api/seasons").then(async (seasons) => {
      const active = seasons.find((s) => s.status === "active") ?? seasons[0];
      if (!active) return;
      setSeasonId(active.id);
      setSeasonYear(active.year);

      const [participants, standings, best] = await Promise.all([
        fetchJsonShared<Participant[]>(`/api/participants?seasonId=${active.id}`),
        fetchJsonShared<StandingRow[]>(`/api/standings?seasonId=${active.id}`),
        fetchJsonShared<BestPlayer>(`/api/players/best?seasonId=${active.id}`),
        fetchJsonShared<{ matchday: number }>(`/api/fixtures/current-matchday?seasonId=${active.id}`).then((data) =>
          setMatchday(data.matchday)
        ),
      ]);

      setParticipantsCount(participants.length);
      setLeader(standings[0] ? { teamName: standings[0].rosterName, ownerName: standings[0].ownerName } : null);
      setBestPlayer(best);
    });
  }, []);

  // Keep "Best player" current: re-import the matchday's votes in the
  // background (same throttled refresh the Players page uses, minus the
  // listone) and recompute the top scorer once they land.
  const { scoresSyncedAt } = usePlayerDataSync(
    seasonId && seasonYear !== null ? { id: seasonId, year: seasonYear } : null,
    matchday,
    { listone: false }
  );

  useEffect(() => {
    if (!scoresSyncedAt || !seasonId) return;
    fetch(`/api/players/best?seasonId=${seasonId}`)
      .then((res) => res.json() as Promise<BestPlayer>)
      .then(setBestPlayer);
  }, [scoresSyncedAt, seasonId]);

  useEffect(() => {
    if (!seasonId || !matchday) return;
    fetch(`/api/fixtures?seasonId=${seasonId}&matchdayNumber=${matchday}`)
      .then((res) => res.json())
      .then(setFixtures);
  }, [seasonId, matchday]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">{t("Dashboard")}</h1>

      <SectionCard title={t("Season summary")}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{t("Active participants")}</p>
            <p className="mt-2 font-mono-data text-2xl font-semibold text-[var(--ink)]">
              {participantsCount?.toString() ?? "—"}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{t("League leader")}</p>
            <p className="mt-2 truncate font-mono-data text-2xl font-semibold text-[var(--ink)]">
              {leader?.teamName ?? "—"}
            </p>
            {leader?.ownerName && <p className="mt-0.5 truncate text-sm text-[var(--ink-muted)]">{leader.ownerName}</p>}
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">{t("Best player")}</p>
            {bestPlayer ? (
              <div className="mt-3 flex items-center gap-4">
                {bestPlayer.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bestPlayer.imageUrl}
                    alt={bestPlayer.fullName}
                    className="aspect-[255/378] w-20 shrink-0 rounded-xl object-cover sm:w-24"
                  />
                ) : (
                  <div className="flex aspect-[255/378] w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-[var(--ink-muted)] sm:w-24">
                    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-mono-data text-2xl font-semibold text-[var(--ink)]">{bestPlayer.fullName}</p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">{bestPlayer.teamName ?? "—"}</p>
                  <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                    {bestPlayer.ownerRosterName
                      ? `${t("Owned by")} ${bestPlayer.ownerRosterName}`
                      : t("Free agent")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 font-mono-data text-2xl font-semibold text-[var(--ink)]">—</p>
            )}
          </div>
        </div>
      </SectionCard>

      <LiveMatchesFeed matchday={matchday} />

      <MatchdayFixturesCard matchday={matchday} fixtures={fixtures} />
    </div>
  );
}
