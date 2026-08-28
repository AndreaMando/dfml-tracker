"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { FilterPill } from "../../components/filter-pill";
import { Tabs } from "../../components/tabs";
import { useTranslation } from "../../lib/i18n";

type Player = {
  id: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
  currentValue: string | null;
  initialValue: string | null;
  fvm: string | null;
  isUnder21: boolean | null;
  status: string | null;
  ownerRosterId: string | null;
  ownerRosterName: string | null;
  ownerParticipantName: string | null;
};

type Season = { id: string; name: string; status: string };

type PlayerStat = {
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
  status: string | null;
  appearances: number;
  totalScore: number;
  avgVote: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  cleanSheets: number;
};

type StatSortKey = keyof Pick<
  PlayerStat,
  | "fullName"
  | "position"
  | "totalScore"
  | "avgVote"
  | "appearances"
  | "goals"
  | "assists"
  | "yellowCards"
  | "redCards"
  | "cleanSheets"
>;

const STRING_SORT_KEYS: StatSortKey[] = ["fullName", "position"];

const positions = ["all", "GK", "DF", "MF", "FW"];

const roleStyles: Record<Player["position"], string> = {
  GK: "bg-sky-50 text-sky-700",
  DF: "bg-emerald-50 text-emerald-700",
  MF: "bg-amber-50 text-amber-700",
  FW: "bg-rose-50 text-rose-700",
};

function OwnerBadge({ player, t }: { player: Player; t: (key: string) => string }) {
  if (!player.ownerRosterName) return null;
  return (
    <Link
      href={`/rosters/${player.ownerRosterId}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full border border-azure/20 bg-azure-soft px-2.5 py-1 text-xs font-medium text-azure-deep transition hover:bg-azure/10"
    >
      {t("Owned by")} {player.ownerRosterName}
    </Link>
  );
}

export default function PlayersPage() {
  const { t } = useTranslation();
  const tabs = [
    { id: "all", label: t("All") },
    { id: "stats", label: t("Player Stats") },
  ];
  const [activeTab, setActiveTab] = useState("all");
  const [activePosition, setActivePosition] = useState("all");
  const [showTransferred, setShowTransferred] = useState(false);
  const [gridSearch, setGridSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");

  // Player Stats tab
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsSearch, setStatsSearch] = useState("");
  const [sortKey, setSortKey] = useState<StatSortKey>("totalScore");
  const [sortDesc, setSortDesc] = useState(true);

  // Sync: fantaasta (listone) + Fantacalcio.it (voti giornata), fired together.
  const [matchdayNumber, setMatchdayNumber] = useState(1);
  const [fantacalcioSeason, setFantacalcioSeason] = useState("2026-27");
  const [fantacalcioMatchday, setFantacalcioMatchday] = useState(1);
  const [syncingAll, setSyncingAll] = useState(false);
  const [fantaastaResult, setFantaastaResult] = useState<{
    created: number;
    updated: number;
    reactivated: number;
    markedTransferred: number;
  } | null>(null);
  const [fantaastaError, setFantaastaError] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; created: string[] } | null>(null);
  const [importError, setImportError] = useState("");

  function loadPlayers() {
    return fetch("/api/players")
      .then((res) => res.json())
      .then(setPlayers);
  }

  function loadStats() {
    if (!seasonId) return;
    setStatsLoading(true);
    return fetch(`/api/players/stats?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }

  useEffect(() => {
    loadPlayers().finally(() => setLoading(false));
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data: Season[]) => {
        setSeasons(data);
        const active = data.find((s) => s.status === "active") ?? data[0];
        if (active) setSeasonId(active.id);
      });
  }, []);

  useEffect(() => {
    loadStats();
  }, [seasonId]);

  async function handleSyncAll(event: React.FormEvent) {
    event.preventDefault();
    setSyncingAll(true);
    setFantaastaError("");
    setFantaastaResult(null);
    setImportError("");
    setImportResult(null);

    const [fantaastaRes, importRes] = await Promise.allSettled([
      fetch("/api/players/sync-fantaasta", { method: "POST" }),
      fetch("/api/scores/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, matchdayNumber, fantacalcioSeason, fantacalcioMatchday }),
      }),
    ]);

    if (fantaastaRes.status === "fulfilled") {
      const data = await fantaastaRes.value.json();
      if (fantaastaRes.value.ok) {
        setFantaastaResult(data);
        await loadPlayers();
      } else {
        setFantaastaError(data.error ?? t("Sync failed"));
      }
    } else {
      setFantaastaError(t("Sync failed"));
    }

    if (importRes.status === "fulfilled") {
      const data = await importRes.value.json();
      if (importRes.value.ok) {
        setImportResult(data);
        loadStats();
      } else {
        setImportError(data.error ?? t("Import failed"));
      }
    } else {
      setImportError(t("Import failed"));
    }

    setSyncingAll(false);
  }

  function toggleSort(key: StatSortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    for (const p of players) if (p.teamName) teams.add(p.teamName);
    return [...teams].sort((a, b) => a.localeCompare(b));
  }, [players]);

  function toggleTeamFilter(team: string) {
    setTeamFilter((prev) => (prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]));
  }

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (!showTransferred && (player.status === "transferred" || !player.teamName)) return false;
      if (activePosition !== "all" && player.position !== activePosition) return false;
      if (teamFilter.length > 0 && (!player.teamName || !teamFilter.includes(player.teamName))) return false;
      if (gridSearch && !player.fullName.toLowerCase().includes(gridSearch.toLowerCase())) return false;
      return true;
    });
  }, [players, activePosition, showTransferred, teamFilter, gridSearch]);

  const statRows = useMemo(() => {
    const filtered = stats.filter((s) => {
      if (!showTransferred && (s.status === "transferred" || !s.teamName)) return false;
      if (activePosition !== "all" && s.position !== activePosition) return false;
      if (statsSearch && !s.fullName.toLowerCase().includes(statsSearch.toLowerCase())) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (STRING_SORT_KEYS.includes(sortKey)) {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDesc ? -cmp : cmp;
      }
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDesc ? -diff : diff;
    });
  }, [stats, activePosition, showTransferred, statsSearch, sortKey, sortDesc]);

  function SortHeader({
    label,
    sortKeyValue,
    title,
  }: {
    label: React.ReactNode;
    sortKeyValue: StatSortKey;
    title?: string;
  }) {
    return (
      <th
        title={title}
        onClick={() => toggleSort(sortKeyValue)}
        className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-center hover:text-azure-deep"
      >
        <span className="inline-flex items-center justify-center gap-1">
          {label}
          {sortKey === sortKeyValue && (sortDesc ? "▾" : "▴")}
        </span>
      </th>
    );
  }

  function StatIcon({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} title={alt} className="mx-auto h-5 w-5 object-contain" />;
  }

  return (
    <ModuleShell
      title={t("Players")}
      description={t("Browse player pool, positions and current valuations.")}
    >
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {positions.map((position) => (
              <FilterPill
                key={position}
                label={position === "all" ? t("All") : t(position)}
                active={activePosition === position}
                onClick={() => setActivePosition(position)}
              />
            ))}
            <label className="ml-2 flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={showTransferred}
                onChange={(event) => setShowTransferred(event.target.checked)}
                className="h-4 w-4"
              />
              {t("Show transferred")}
            </label>
          </div>
          <Link
            href="/players/new"
            className="rounded-2xl border border-azure/20 bg-azure-soft px-4 py-2 text-sm font-semibold text-azure-deep transition hover:bg-azure/10"
          >
            {t("Add player")}
          </Link>
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <SectionCard
        title={t("Sync players & stats")}
        description={t("Update the listone from fantaasta and import matchday votes from Fantacalcio.it, in parallel.")}
      >
        <form onSubmit={handleSyncAll} className="flex flex-wrap items-end gap-3">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Season")}</span>
            <select
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Matchday")}</span>
            <input
              type="number"
              min={1}
              value={matchdayNumber}
              onChange={(event) => setMatchdayNumber(Number(event.target.value) || 1)}
              className="w-24 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Fantacalcio.it season")}</span>
            <input
              value={fantacalcioSeason}
              onChange={(event) => setFantacalcioSeason(event.target.value)}
              placeholder="2025-26"
              className="w-32 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Fantacalcio.it matchday")}</span>
            <input
              type="number"
              min={1}
              value={fantacalcioMatchday}
              onChange={(event) => setFantacalcioMatchday(Number(event.target.value) || 1)}
              className="w-28 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <button
            type="submit"
            disabled={syncingAll}
            className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
          >
            {syncingAll ? t("Syncing") + "..." : t("Sync all")}
          </button>
        </form>
        {fantaastaError && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {t("Sync from fantaasta")}: {fantaastaError}
          </p>
        )}
        {fantaastaResult && (
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("Sync summary")}: {t("New")} {fantaastaResult.created} · {t("Updated")} {fantaastaResult.updated} ·{" "}
            {t("Transferred out")} {fantaastaResult.markedTransferred} · {t("Reactivated")} {fantaastaResult.reactivated}
          </p>
        )}
        {importError && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {t("Import from Fantacalcio.it")}: {importError}
          </p>
        )}
        {importResult && (
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("Imported")} {importResult.imported}.{" "}
            {importResult.created.length > 0 &&
              `${t("New players created")}: ${importResult.created.join(", ")}`}
          </p>
        )}
      </SectionCard>

      <div className="mt-6">
        {activeTab === "all" ? (
          loading ? (
            <p className="text-sm text-ink-muted">{t("Loading")}...</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="block max-w-xs flex-1 space-y-2 text-sm text-ink">
                  <span>{t("Search player")}</span>
                  <input
                    value={gridSearch}
                    onChange={(event) => setGridSearch(event.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
                  />
                </label>
                <details className="relative">
                  <summary className="cursor-pointer select-none rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure">
                    {teamFilter.length === 0
                      ? t("All teams")
                      : `${t("Teams")} (${teamFilter.length})`}
                  </summary>
                  <div className="absolute z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-lg">
                    {teamFilter.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTeamFilter([])}
                        className="mb-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-azure-deep hover:bg-azure-soft"
                      >
                        {t("Clear")}
                      </button>
                    )}
                    {allTeams.map((team) => (
                      <label
                        key={team}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface-alt"
                      >
                        <input
                          type="checkbox"
                          checked={teamFilter.includes(team)}
                          onChange={() => toggleTeamFilter(team)}
                          className="h-4 w-4"
                        />
                        {team}
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="relative flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-azure/40 hover:shadow-md"
                >
                  <Link href={`/players/${player.id}`} className="absolute inset-0 z-10" aria-label={player.fullName} />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-ink">{player.fullName}</h2>
                      <p className="mt-1 text-sm text-ink-muted">{player.teamName ?? "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${roleStyles[player.position]}`}
                      >
                        {t(player.position)}
                      </span>
                      {player.status === "transferred" && (
                        <span className="rounded-full bg-ink/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                          {t("Transferred")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-alt px-3 py-3 text-sm text-ink">
                    <span className="text-ink-muted">{t("Value")}</span>
                    <strong>{player.currentValue ?? "—"}</strong>
                  </div>
                  <p className="-mt-2 text-sm text-ink-muted">FVM {player.fvm ?? "—"}</p>

                  {player.ownerRosterName && (
                    <div className="relative z-20 self-start">
                      <OwnerBadge player={player} t={t} />
                    </div>
                  )}
                </div>
                ))}
                {filteredPlayers.length === 0 && (
                  <p className="text-sm text-ink-muted">{t("No data yet")}</p>
                )}
              </div>
            </>
          )
        ) : (
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4">
              <label className="block max-w-xs space-y-2 text-sm text-ink">
                <span>{t("Search player")}</span>
                <input
                  value={statsSearch}
                  onChange={(event) => setStatsSearch(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
                />
              </label>
            </div>

            {statsLoading ? (
              <p className="text-sm text-ink-muted">{t("Loading")}...</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="min-w-full text-sm text-ink">
                  <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th
                        onClick={() => toggleSort("fullName")}
                        className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left hover:text-azure-deep"
                      >
                        {t("Player")}
                        {sortKey === "fullName" && (sortDesc ? " ▾" : " ▴")}
                      </th>
                      <SortHeader label={t("Role")} sortKeyValue="position" title={t("Position")} />
                      <SortHeader label={t("PG")} sortKeyValue="appearances" title={t("Appearances")} />
                      <SortHeader label={t("Avg")} sortKeyValue="avgVote" title={t("Average vote")} />
                      <SortHeader
                        label={<StatIcon src="/icons8-goal-50.png" alt={t("Goals")} />}
                        sortKeyValue="goals"
                        title={t("Goals")}
                      />
                      <SortHeader
                        label={<StatIcon src="/icons8-assist-64.png" alt={t("Assists")} />}
                        sortKeyValue="assists"
                        title={t("Assists")}
                      />
                      <SortHeader
                        label={<StatIcon src="/icons8-yellow-card-64.png" alt={t("Yellow cards")} />}
                        sortKeyValue="yellowCards"
                        title={t("Yellow cards")}
                      />
                      <SortHeader
                        label={<StatIcon src="/icons8-red-card-64.png" alt={t("Red cards")} />}
                        sortKeyValue="redCards"
                        title={t("Red cards")}
                      />
                      <SortHeader
                        label={<StatIcon src="/icons8-clean-sheet-80.png" alt={t("Clean sheets")} />}
                        sortKeyValue="cleanSheets"
                        title={t("Clean sheets")}
                      />
                      <SortHeader label={t("FV")} sortKeyValue="totalScore" title={t("Total fantavoto")} />
                    </tr>
                  </thead>
                  <tbody>
                    {statRows.map((row) => (
                      <tr key={row.playerId} className="border-t border-line">
                        <td className="whitespace-nowrap px-3 py-2">
                          <Link href={`/players/${row.playerId}`} className="flex items-center gap-2 hover:underline">
                            <span className="font-medium text-ink">{row.fullName}</span>
                            <span className="text-xs text-ink-muted">{row.teamName ?? "—"}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleStyles[row.position]}`}
                          >
                            {t(row.position)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">{row.appearances}</td>
                        <td className="px-3 py-2 text-center">{row.avgVote.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{row.goals}</td>
                        <td className="px-3 py-2 text-center">{row.assists}</td>
                        <td className="px-3 py-2 text-center">{row.yellowCards}</td>
                        <td className="px-3 py-2 text-center">{row.redCards}</td>
                        <td className="px-3 py-2 text-center">{row.position === "GK" ? row.cleanSheets : "—"}</td>
                        <td className="px-3 py-2 text-center font-semibold text-azure-deep">
                          {row.totalScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {statRows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-sm text-ink-muted">
                          {t("No data yet")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
