"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check, Trophy } from "lucide-react";
import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";
import { CUP_FINAL_ROUND, cupRoundLabelKey } from "../../lib/cup";

type Season = {
  id: string;
  name: string;
  year: number;
  status: "draft" | "active" | "finished" | "archived";
  startDate: string | null;
  endDate: string | null;
};

type MarketSession = {
  id: string;
  type: "initial_auction" | "repair_summer" | "repair_winter" | "open_market";
  label: string | null;
  startDate: string | null;
  endDate: string | null;
  isOpen: boolean | null;
};

type Fixture = {
  id: string;
  matchdayNumber: number;
  homeName: string | null;
  awayName: string | null;
  scoreHome: string | null;
  scoreAway: string | null;
  goalsHome: number | null;
  goalsAway: number | null;
  status: string;
};

type StandingRow = {
  rosterId: string;
  rosterName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  totalScore: number;
};

type PlayerStat = {
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
};

type SeasonData = {
  market: MarketSession[];
  fixtures: Fixture[];
  cupFixtures: Fixture[];
  standings: StandingRow[];
  stats: PlayerStat[];
};

const TYPE_LABELS: Record<MarketSession["type"], string> = {
  initial_auction: "Initial auction",
  repair_summer: "Summer repair market",
  repair_winter: "Winter repair market",
  open_market: "Open market",
};

const STATUS_LABELS: Record<Season["status"], string> = {
  draft: "Draft",
  active: "Season active",
  finished: "Finished",
  archived: "Season archived",
};

const STATUS_STYLES: Record<Season["status"], string> = {
  draft: "bg-surface-alt text-ink-muted",
  active: "bg-emerald-50 text-emerald-700",
  finished: "bg-azure-soft text-azure-deep",
  archived: "bg-ink/80 text-white",
};

const RANK_STYLES = ["bg-amber-400 text-amber-950", "bg-slate-300 text-slate-800", "bg-orange-300 text-orange-950"];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function computeAwards(stats: PlayerStat[]) {
  const played = stats.filter((s) => s.appearances > 0);
  const topScorer = [...played].sort((a, b) => b.goals - a.goals)[0];
  const topAssist = [...played].sort((a, b) => b.assists - a.assists)[0];
  const goalkeepers = played.filter((s) => s.position === "GK");
  const goldenGlove = [...goalkeepers].sort((a, b) => b.cleanSheets - a.cleanSheets)[0];
  return {
    topScorer: topScorer && topScorer.goals > 0 ? topScorer : null,
    topAssist: topAssist && topAssist.assists > 0 ? topAssist : null,
    goldenGlove: goldenGlove && goldenGlove.cleanSheets > 0 ? goldenGlove : null,
  };
}

// Bracket progression (who advances to the next round) isn't computed by
// this app — but once the Finale fixture itself has a recorded result, the
// winner is just "whoever won that one match", same goals/score comparison
// already used to determine any fixture's outcome.
function getCupWinner(cupFixtures: Fixture[]) {
  const final = cupFixtures.find((f) => f.matchdayNumber === CUP_FINAL_ROUND && f.status === "played");
  if (!final) return null;
  const hasGoals = final.goalsHome !== null && final.goalsAway !== null;
  const homeMetric = hasGoals ? final.goalsHome! : Number(final.scoreHome ?? 0);
  const awayMetric = hasGoals ? final.goalsAway! : Number(final.scoreAway ?? 0);
  if (homeMetric === awayMetric) return null;
  return homeMetric > awayMetric ? final.homeName : final.awayName;
}

function MatchRow({ fixture }: { fixture: Fixture }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-alt px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:flex-1">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="flex min-h-20 items-center break-words text-sm font-medium text-ink">
            {fixture.homeName ?? "—"}
          </span>
          <span className="text-lg font-bold text-ink">{fixture.goalsHome ?? "-"}</span>
          <span className="text-[11px] text-ink-muted">{fixture.scoreHome ?? "—"}</span>
        </div>

        <span className="pt-20 text-ink-muted">—</span>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="flex min-h-20 items-center break-words text-sm font-medium text-ink">
            {fixture.awayName ?? "—"}
          </span>
          <span className="text-lg font-bold text-ink">{fixture.goalsAway ?? "-"}</span>
          <span className="text-[11px] text-ink-muted">{fixture.scoreAway ?? "—"}</span>
        </div>
      </div>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full bg-emerald-50 text-emerald-700">
        <Check size={13} />
      </span>
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dataBySeason, setDataBySeason] = useState<Record<string, SeasonData>>({});
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState("");

  async function loadAll() {
    const seasonsRes: Season[] = await fetch("/api/seasons").then((res) => res.json());
    const sorted = [...seasonsRes].sort((a, b) => b.year - a.year);
    setSeasons(sorted);

    const entries = await Promise.all(
      sorted.map(async (s) => {
        const [market, fixtures, cupFixtures, standings, stats] = await Promise.all([
          fetch(`/api/market?seasonId=${s.id}`).then((res) => res.json()),
          fetch(`/api/fixtures?seasonId=${s.id}`).then((res) => res.json()),
          fetch(`/api/fixtures?seasonId=${s.id}&competition=cup`).then((res) => res.json()),
          fetch(`/api/standings?seasonId=${s.id}`).then((res) => res.json()),
          fetch(`/api/players/stats?seasonId=${s.id}`).then((res) => res.json()),
        ]);
        return [s.id, { market, fixtures, cupFixtures, standings, stats }] as const;
      })
    );
    setDataBySeason(Object.fromEntries(entries));
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCloseSeason(id: string) {
    if (!confirm(t("Close this season? Final standings and top scorer/assist-man/goalkeeper awards will be stored.")))
      return;
    setClosingId(id);
    await fetch(`/api/seasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    await loadAll();
    setClosingId("");
  }

  return (
    <ModuleShell title={t("History")} description={t("Review the recent chronology of league actions.")}>
      {loading ? (
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      ) : (
        <div className="space-y-4">
          {seasons.map((season) => {
            const data = dataBySeason[season.id];
            const playedFixtures = (data?.fixtures ?? []).filter((f) => f.status === "played");
            const byMatchday = new Map<number, Fixture[]>();
            for (const fixture of playedFixtures) {
              const list = byMatchday.get(fixture.matchdayNumber) ?? [];
              list.push(fixture);
              byMatchday.set(fixture.matchdayNumber, list);
            }
            const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);
            const isConcluded = season.status === "finished" || season.status === "archived";
            const awards = data ? computeAwards(data.stats) : null;

            const cupFixtures = (data?.cupFixtures ?? []).filter((f) => f.status === "played");
            const cupByRound = new Map<number, Fixture[]>();
            for (const fixture of cupFixtures) {
              const list = cupByRound.get(fixture.matchdayNumber) ?? [];
              list.push(fixture);
              cupByRound.set(fixture.matchdayNumber, list);
            }
            const cupRounds = [...cupByRound.keys()].sort((a, b) => a - b);
            const cupWinner = data ? getCupWinner(data.cupFixtures) : null;

            return (
              <details
                key={season.id}
                open={season.status === "active"}
                className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <ChevronDown size={18} className="text-ink-muted transition group-open:rotate-180" />
                    <div>
                      <h2 className="font-display text-xl font-bold text-ink">{season.name}</h2>
                      <p className="text-sm text-ink-muted">{season.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${STATUS_STYLES[season.status]}`}
                    >
                      {t(STATUS_LABELS[season.status])}
                    </span>
                    {season.status === "active" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          handleCloseSeason(season.id);
                        }}
                        disabled={closingId === season.id}
                        className="rounded-2xl border border-azure/20 bg-azure-soft px-4 py-2 text-xs font-semibold text-azure-deep transition hover:bg-azure/10 disabled:opacity-50"
                      >
                        {closingId === season.id ? t("Closing") + "..." : t("Close season")}
                      </button>
                    )}
                  </div>
                </summary>

                <div className="space-y-6 border-t border-line p-5">
                  <section>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                      {t("Market history")}
                    </h3>
                    {(data?.market.length ?? 0) === 0 ? (
                      <p className="text-sm text-ink-muted">{t("No market sessions recorded yet.")}</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {data!.market.map((session) => (
                          <div key={session.id} className="rounded-2xl border border-line bg-surface-alt p-4">
                            <span className="inline-flex rounded-full bg-azure-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-azure-deep">
                              {t(TYPE_LABELS[session.type])}
                            </span>
                            {session.label && <p className="mt-2 text-sm font-medium text-ink">{session.label}</p>}
                            <p className="mt-1 text-xs text-ink-muted">
                              {formatDate(session.startDate)} — {formatDate(session.endDate)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                      {t("Matchday results")}
                    </h3>
                    {matchdays.length === 0 ? (
                      <p className="text-sm text-ink-muted">{t("No matchdays played yet.")}</p>
                    ) : (
                      <div className="space-y-2">
                        {matchdays.map((md) => (
                          <details key={md} className="group/md rounded-2xl border border-line">
                            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink">
                              <ChevronDown size={14} className="transition group-open/md:rotate-180" />
                              {t("Matchday")} {md}
                            </summary>
                            <div className="space-y-2 px-3 pb-3 pt-1">
                              {byMatchday.get(md)!.map((fixture) => (
                                <MatchRow key={fixture.id} fixture={fixture} />
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </section>

                  {cupRounds.length > 0 && (
                    <section>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                        {t("Cup")}
                      </h3>
                      {cupWinner && (
                        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                          <Trophy size={16} />
                          {t("Cup winner")}: {cupWinner}
                        </div>
                      )}
                      <div className="space-y-2">
                        {cupRounds.map((round) => (
                          <details key={round} className="group/cup rounded-2xl border border-line">
                            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink">
                              <ChevronDown size={14} className="transition group-open/cup:rotate-180" />
                              {t(cupRoundLabelKey(round))}
                            </summary>
                            <div className="space-y-2 px-3 pb-3 pt-1">
                              {cupByRound.get(round)!.map((fixture) => (
                                <MatchRow key={fixture.id} fixture={fixture} />
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </section>
                  )}

                  {isConcluded && (
                    <>
                      <section>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                          {t("Final standings")}
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-line">
                          <table className="w-full text-sm text-ink">
                            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                              <tr>
                                <th className="px-3 py-2 text-center">{t("Rank")}</th>
                                <th className="px-3 py-2 text-left">{t("Roster")}</th>
                                <th className="px-3 py-2 text-center">{t("Points")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data!.standings.map((entry, index) => (
                                <tr key={entry.rosterId} className="border-t border-line">
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                        RANK_STYLES[index] ?? "bg-surface-alt text-ink-muted"
                                      }`}
                                    >
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-medium text-ink">{entry.rosterName}</td>
                                  <td className="px-3 py-2 text-center font-bold text-azure-deep">{entry.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                          {t("Season awards")}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { label: t("Top scorer"), entry: awards?.topScorer, stat: awards?.topScorer?.goals, unit: t("goals") },
                            { label: t("Top assist-man"), entry: awards?.topAssist, stat: awards?.topAssist?.assists, unit: t("assists") },
                            { label: t("Golden Glove"), entry: awards?.goldenGlove, stat: awards?.goldenGlove?.cleanSheets, unit: t("clean sheets") },
                          ].map((award) => (
                            <div key={award.label} className="rounded-2xl border border-line bg-surface-alt p-4 text-center">
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{award.label}</p>
                              <p className="mt-2 font-display text-lg font-bold text-ink">
                                {award.entry?.fullName ?? "—"}
                              </p>
                              {award.entry && (
                                <p className="mt-1 text-sm text-azure-deep">
                                  {award.stat} {award.unit}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </details>
            );
          })}
          {seasons.length === 0 && <p className="text-sm text-ink-muted">{t("No data yet")}</p>}
        </div>
      )}
    </ModuleShell>
  );
}
