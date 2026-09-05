"use client";

import { useEffect, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { Tabs } from "../../components/tabs";
import { CupBracket, type CupFixture } from "../../components/cup-bracket";
import { ChampionIcon, getChampionBadges, useChampions } from "../../components/champion-badge";
import { useTranslation } from "../../lib/i18n";

type Season = { id: string; name: string; status: string };
type StandingRow = {
  rosterId: string;
  rosterName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  totalScore: number;
  penaltyPoints: number;
};
type Roster = { id: string; seasonId: string; participantName: string | null; participantUserId: string | null };

const RANK_STYLES = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-300 text-orange-950",
];

export default function StandingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("league");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [cupFixtures, setCupFixtures] = useState<CupFixture[]>([]);
  const [rosterManagerById, setRosterManagerById] = useState<Map<string, string>>(new Map());
  const [rosterUserIdById, setRosterUserIdById] = useState<Map<string, string | null>>(new Map());
  const champions = useChampions(seasonId);

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data: Season[]) => {
        setSeasons(data);
        const active = data.find((s) => s.status === "active") ?? data[0];
        if (active) setSeasonId(active.id);
      });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    setLoading(true);
    fetch(`/api/standings?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then(setStandings)
      .finally(() => setLoading(false));
  }, [seasonId]);

  useEffect(() => {
    if (!seasonId) return;
    fetch(`/api/fixtures?seasonId=${seasonId}&competition=cup`)
      .then((res) => res.json())
      .then(setCupFixtures);
    fetch("/api/rosters")
      .then((res) => res.json())
      .then((data: Roster[]) => {
        const forSeason = data.filter((r) => r.seasonId === seasonId);
        setRosterManagerById(new Map(forSeason.map((r) => [r.id, r.participantName ?? ""])));
        setRosterUserIdById(new Map(forSeason.map((r) => [r.id, r.participantUserId])));
      });
  }, [seasonId]);

  const tabs = [
    { id: "league", label: t("Standings") },
    { id: "cup", label: t("Cup") },
  ];

  return (
    <ModuleShell title={t("Standings")} description={t("Monitor the live table and current league positions.")}>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="block max-w-xs space-y-2 text-sm text-ink">
          <span>{t("Season")}</span>
          <select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "league" ? (
        loading ? (
          <p className="text-sm text-ink-muted">{t("Loading")}...</p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-ink">
                <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 text-center">{t("Rank")}</th>
                    <th className="px-4 py-3 text-left">{t("Roster")}</th>
                    <th className="px-4 py-3 text-center">{t("Played")}</th>
                    <th className="px-4 py-3 text-center">{t("Won")}</th>
                    <th className="px-4 py-3 text-center">{t("Drawn")}</th>
                    <th className="px-4 py-3 text-center">{t("Lost")}</th>
                    <th className="px-4 py-3 text-center">{t("Total score")}</th>
                    <th className="px-4 py-3 text-center">{t("Points")}</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((entry, index) => (
                    <tr
                      key={entry.rosterId}
                      className="border-t border-line transition even:bg-surface-alt/40 hover:bg-azure-soft/40"
                    >
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            RANK_STYLES[index] ?? "bg-surface-alt text-ink-muted"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left font-semibold text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          {entry.rosterName}
                          {getChampionBadges(champions, rosterUserIdById.get(entry.rosterId)).map((badge, i) => (
                            <ChampionIcon
                              key={i}
                              type={badge.type}
                              label={`${t(badge.type === "league" ? "League winner" : "Cup winner")} ${badge.seasonName}`}
                            />
                          ))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-ink-muted">{entry.played}</td>
                      <td className="px-4 py-3 text-center text-ink-muted">{entry.won}</td>
                      <td className="px-4 py-3 text-center text-ink-muted">{entry.drawn}</td>
                      <td className="px-4 py-3 text-center text-ink-muted">{entry.lost}</td>
                      <td className="px-4 py-3 text-center text-ink-muted">{entry.totalScore.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-azure-soft px-3 py-1 text-sm font-bold text-azure-deep">
                          {entry.points}
                        </span>
                        {entry.penaltyPoints > 0 && (
                          <span
                            title={t("Includes a standings penalty")}
                            className="ml-1.5 text-xs font-semibold text-rose-600"
                          >
                            (-{entry.penaltyPoints})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-muted">
                        {t("No data yet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <CupBracket fixtures={cupFixtures} rosterManagerById={rosterManagerById} />
        </div>
      )}
    </ModuleShell>
  );
}
