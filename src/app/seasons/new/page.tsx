"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

type Season = { id: string; name: string; year: number; status: string };
type Roster = {
  id: string;
  seasonId: string;
  name: string | null;
  creditsRemaining: string | null;
  playerCount: number;
  participantName: string | null;
};
type StandingRow = { rosterId: string; points: number; totalScore: number };
type ImportResult = {
  oldRosterId: string;
  newRosterId: string;
  teamName: string;
  rank: number;
  creditsBonus: number;
  creditsRemaining: number;
  playersCopied: number;
  playersSkippedTransferred: { fullName: string }[];
};

export default function SeasonCreatePage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState("draft");
  const [leagueCompetitionId, setLeagueCompetitionId] = useState("");
  const [cupCompetitionId, setCupCompetitionId] = useState("");
  const [creating, setCreating] = useState(false);

  const [createdSeason, setCreatedSeason] = useState<Season | null>(null);

  const [pastSeasons, setPastSeasons] = useState<Season[]>([]);
  const [sourceSeasonId, setSourceSeasonId] = useState("");
  const [sourceRosters, setSourceRosters] = useState<Roster[]>([]);
  const [rankByRosterId, setRankByRosterId] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult[] | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    const res = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        year,
        status,
        leagueCompetitionId: leagueCompetitionId || null,
        cupCompetitionId: cupCompetitionId || null,
      }),
    });
    const created: Season = await res.json();
    setCreatedSeason(created);
    setCreating(false);

    const seasons: Season[] = await fetch("/api/seasons").then((r) => r.json());
    setPastSeasons(seasons.filter((s) => s.id !== created.id && (s.status === "finished" || s.status === "archived")));
  }

  useEffect(() => {
    if (!sourceSeasonId) {
      setSourceRosters([]);
      setRankByRosterId(new Map());
      setSelected(new Set());
      return;
    }
    Promise.all([
      fetch("/api/rosters").then((r) => r.json()) as Promise<Roster[]>,
      fetch(`/api/standings?seasonId=${sourceSeasonId}`).then((r) => r.json()) as Promise<StandingRow[]>,
    ]).then(([allRosters, standings]) => {
      const rosters = allRosters.filter((r) => r.seasonId === sourceSeasonId);
      setSourceRosters(rosters);
      setSelected(new Set(rosters.map((r) => r.id)));
      const sorted = [...standings].sort((a, b) => b.points - a.points || b.totalScore - a.totalScore);
      setRankByRosterId(new Map(sorted.map((row, index) => [row.rosterId, index + 1])));
    });
  }, [sourceSeasonId]);

  function toggleSelected(rosterId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rosterId)) next.delete(rosterId);
      else next.add(rosterId);
      return next;
    });
  }

  async function handleImport() {
    if (!createdSeason || selected.size === 0) return;
    setImporting(true);
    const res = await fetch(`/api/seasons/${createdSeason.id}/import-rosters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceSeasonId, rosterIds: [...selected] }),
    });
    const data: { imported: ImportResult[] } = await res.json();
    setImportResult(data.imported);
    setImporting(false);
  }

  if (createdSeason) {
    return (
      <ModuleShell
        title={t("Create Season")}
        description={t("Add a new league season to the tracker.")}
        backHref="/seasons"
        backLabel={t("Back to seasons")}
      >
        <PageHeader title={t("Season created")} subtitle={createdSeason.name} />

        <div className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h3 className="text-base font-semibold text-ink">{t("Import teams from a previous season")}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {t(
              "Optional — carry over rosters, paid prices and remaining credits (plus the end-of-season bonus) from a finished season."
            )}
          </p>

          {pastSeasons.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">{t("No finished seasons to import from yet.")}</p>
          ) : (
            <>
              <label className="mt-4 block space-y-2 text-sm text-ink">
                <span>{t("Source season")}</span>
                <select
                  value={sourceSeasonId}
                  onChange={(event) => {
                    setSourceSeasonId(event.target.value);
                    setImportResult(null);
                  }}
                  className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
                >
                  <option value="">{t("Select a season")}</option>
                  {pastSeasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              {sourceRosters.length > 0 && !importResult && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                  <table className="w-full text-left text-sm text-ink">
                    <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-3 py-2"></th>
                        <th className="px-3 py-2">{t("Team")}</th>
                        <th className="px-3 py-2">{t("Manager")}</th>
                        <th className="px-3 py-2 text-center">{t("Final rank")}</th>
                        <th className="px-3 py-2 text-center">{t("Credits")}</th>
                        <th className="px-3 py-2 text-center">{t("Credits bonus")}</th>
                        <th className="px-3 py-2 text-center">{t("Roster")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRosters.map((roster) => {
                        const rank = rankByRosterId.get(roster.id) ?? sourceRosters.length;
                        const bonus = rank <= 3 ? 50 : rank <= 5 ? 75 : 100;
                        return (
                          <tr key={roster.id} className="border-t border-line">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selected.has(roster.id)}
                                onChange={() => toggleSelected(roster.id)}
                                className="h-4 w-4 rounded border-line"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium text-ink">{roster.name}</td>
                            <td className="px-3 py-2 text-ink-muted">{roster.participantName}</td>
                            <td className="px-3 py-2 text-center">{rank}</td>
                            <td className="px-3 py-2 text-center font-mono-data">
                              {Number(roster.creditsRemaining ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center font-mono-data text-emerald-600">+{bonus}</td>
                            <td className="px-3 py-2 text-center">{roster.playerCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {sourceRosters.length > 0 && !importResult && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || selected.size === 0}
                  className="mt-4 rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
                >
                  {importing ? t("Importing teams") + "..." : t("Import selected teams")}
                </button>
              )}

              {importResult && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-ink">{t("Import summary")}</h4>
                  {importResult.map((r) => (
                    <div key={r.newRosterId} className="rounded-2xl border border-line bg-surface-alt p-4 text-sm">
                      <p className="font-medium text-ink">
                        {r.teamName} — {t("Final rank")} {r.rank}
                      </p>
                      <p className="mt-1 text-ink-muted">
                        {t("Credits")}: <strong className="text-ink">{r.creditsRemaining.toFixed(2)}</strong> (+{r.creditsBonus}{" "}
                        {t("Credits bonus")}) · {r.playersCopied} {t("Players")}
                      </p>
                      {r.playersSkippedTransferred.length > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          {t("Players not carried over (transferred out of Serie A)")}:{" "}
                          {r.playersSkippedTransferred.map((p) => p.fullName).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <Link
          href="/seasons"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-azure transition hover:text-azure-deep"
        >
          {importResult ? t("Go to seasons") : t("Skip, start from scratch")}
        </Link>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      title={t("Create Season")}
      description={t("Add a new league season to the tracker.")}
      backHref="/seasons"
      backLabel={t("Back to seasons")}
    >
      <PageHeader title={t("New season")} subtitle={t("Create a season and configure the league timeline.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-line bg-surface p-6" onSubmit={handleCreate}>
        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Name")}</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
            placeholder={t("DFML 26/27")}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Year")}</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          />
        </label>

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Status")}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          >
            <option value="draft">{t("Draft")}</option>
            <option value="active">{t("Active")}</option>
            <option value="finished">{t("Finished")}</option>
          </select>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("League competition ID")}</span>
            <input
              value={leagueCompetitionId}
              onChange={(event) => setLeagueCompetitionId(event.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              placeholder="26549"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Cup competition ID")}</span>
            <input
              value={cupCompetitionId}
              onChange={(event) => setCupCompetitionId(event.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              placeholder="26657"
            />
          </label>
        </div>
        <p className="-mt-3 text-xs text-ink-muted">
          {t("From the leghe.fantacalcio.it calendar URL for this league. Optional, needed only for automatic sync.")}
        </p>

        <button
          type="submit"
          disabled={creating || !name}
          className="w-full rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
        >
          {creating ? t("Saving") + "..." : t("Create season")}
        </button>
      </form>
    </ModuleShell>
  );
}
