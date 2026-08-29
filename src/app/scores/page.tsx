"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";

type Season = { id: string; name: string; status: string };
type Roster = { id: string; name: string | null; seasonId: string };
type Fixture = {
  id: string;
  matchdayNumber: number;
  rosterIdHome: string | null;
  rosterIdAway: string | null;
  homeName: string | null;
  awayName: string | null;
  scoreHome: string | null;
  scoreAway: string | null;
  goalsHome: number | null;
  goalsAway: number | null;
  status: string;
};
type CompositionRow = {
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
};
type RosterDetail = { id: string; players: CompositionRow[] };
type ScoreRow = {
  id: string;
  playerId: string;
  vote: string | null;
  score: string | null;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
  cleanSheet: boolean | null;
  penaltiesSaved: number | null;
  penaltiesMissed: number | null;
  ownGoals: number | null;
};

type PlayerFormState = {
  vote: string;
  goals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
  cleanSheet: boolean;
  penaltiesSaved: string;
  penaltiesMissed: string;
  ownGoals: string;
};

const emptyForm: PlayerFormState = {
  vote: "",
  goals: "",
  assists: "",
  yellowCards: "",
  redCards: "",
  cleanSheet: false,
  penaltiesSaved: "",
  penaltiesMissed: "",
  ownGoals: "",
};

export default function ScoresPage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [matchdayNumber, setMatchdayNumber] = useState(1);
  const [maxMatchday, setMaxMatchday] = useState(38);
  const [rosters, setRosters] = useState<Roster[]>([]);

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [newHome, setNewHome] = useState("");
  const [newAway, setNewAway] = useState("");

  const [statsRosterId, setStatsRosterId] = useState("");
  const [rosterDetail, setRosterDetail] = useState<RosterDetail | null>(null);
  const [existingScores, setExistingScores] = useState<ScoreRow[]>([]);
  const [forms, setForms] = useState<Record<string, PlayerFormState>>({});
  const [savingPlayerId, setSavingPlayerId] = useState("");

  const [competitionId, setCompetitionId] = useState("26549");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: number; notMatched: string[] } | null>(null);
  const [syncError, setSyncError] = useState("");

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
    fetch("/api/rosters")
      .then((res) => res.json())
      .then((data: Roster[]) => setRosters(data.filter((r) => r.seasonId === seasonId)));
  }, [seasonId]);

  // Matchday selector: default to the current matchday (last one with played
  // fixtures, same logic as the top ticker) and cap the dropdown at however
  // many matchdays this season's calendar actually has.
  useEffect(() => {
    if (!seasonId) return;
    fetch(`/api/fixtures?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then((all: Fixture[]) => {
        if (all.length === 0) return;
        setMaxMatchday(Math.max(...all.map((f) => f.matchdayNumber)));
        const played = all.filter((f) => f.status === "played").map((f) => f.matchdayNumber);
        setMatchdayNumber(played.length > 0 ? Math.max(...played) : 1);
      });
  }, [seasonId]);

  function loadFixtures() {
    if (!seasonId) return;
    fetch(`/api/fixtures?seasonId=${seasonId}&matchdayNumber=${matchdayNumber}`)
      .then((res) => res.json())
      .then(setFixtures);
  }

  useEffect(loadFixtures, [seasonId, matchdayNumber]);

  async function handleCreateFixture(event: React.FormEvent) {
    event.preventDefault();
    if (!newHome || !newAway) return;
    await fetch("/api/fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, matchdayNumber, rosterIdHome: newHome, rosterIdAway: newAway }),
    });
    setNewHome("");
    setNewAway("");
    loadFixtures();
  }

  async function handleFixtureScoreBlur(
    fixtureId: string,
    field: "scoreHome" | "scoreAway" | "goalsHome" | "goalsAway",
    value: string
  ) {
    const isGoalField = field === "goalsHome" || field === "goalsAway";
    await fetch(`/api/fixtures/${fixtureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value === "" ? null : isGoalField ? Number(value) : value }),
    });
    loadFixtures();
  }

  async function handleSyncResults(event: React.FormEvent) {
    event.preventDefault();
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    const res = await fetch("/api/fixtures/sync-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, competitionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSyncError(data.error ?? t("Sync failed"));
    } else {
      setSyncResult(data);
      loadFixtures();
    }
    setSyncing(false);
  }

  async function handleDeleteFixture(fixtureId: string) {
    await fetch(`/api/fixtures/${fixtureId}`, { method: "DELETE" });
    loadFixtures();
  }

  useEffect(() => {
    if (!statsRosterId) {
      setRosterDetail(null);
      return;
    }
    fetch(`/api/rosters/${statsRosterId}`)
      .then((res) => res.json())
      .then(setRosterDetail);
  }, [statsRosterId]);

  function loadExistingScores() {
    if (!seasonId || !statsRosterId) return;
    fetch(`/api/scores?seasonId=${seasonId}&matchdayNumber=${matchdayNumber}&rosterId=${statsRosterId}`)
      .then((res) => res.json())
      .then((data: ScoreRow[]) => {
        setExistingScores(data);
        const nextForms: Record<string, PlayerFormState> = {};
        for (const row of data) {
          nextForms[row.playerId] = {
            vote: row.vote ?? "",
            goals: row.goals?.toString() ?? "",
            assists: row.assists?.toString() ?? "",
            yellowCards: row.yellowCards?.toString() ?? "",
            redCards: row.redCards?.toString() ?? "",
            cleanSheet: !!row.cleanSheet,
            penaltiesSaved: row.penaltiesSaved?.toString() ?? "",
            penaltiesMissed: row.penaltiesMissed?.toString() ?? "",
            ownGoals: row.ownGoals?.toString() ?? "",
          };
        }
        setForms(nextForms);
      });
  }

  useEffect(loadExistingScores, [seasonId, statsRosterId, matchdayNumber]);

  function updateForm(playerId: string, patch: Partial<PlayerFormState>) {
    setForms((prev) => ({ ...prev, [playerId]: { ...(prev[playerId] ?? emptyForm), ...patch } }));
  }

  const existingByPlayer = useMemo(
    () => new Map(existingScores.map((row) => [row.playerId, row])),
    [existingScores]
  );

  async function handleSavePlayer(playerId: string) {
    const form = forms[playerId] ?? emptyForm;
    const existing = existingByPlayer.get(playerId);
    const payload = {
      seasonId,
      rosterId: statsRosterId,
      playerId,
      matchdayNumber,
      vote: form.vote || null,
      goals: form.goals ? Number(form.goals) : null,
      assists: form.assists ? Number(form.assists) : null,
      yellowCards: form.yellowCards ? Number(form.yellowCards) : null,
      redCards: form.redCards ? Number(form.redCards) : null,
      cleanSheet: form.cleanSheet,
      penaltiesSaved: form.penaltiesSaved ? Number(form.penaltiesSaved) : null,
      penaltiesMissed: form.penaltiesMissed ? Number(form.penaltiesMissed) : null,
      ownGoals: form.ownGoals ? Number(form.ownGoals) : null,
    };
    setSavingPlayerId(playerId);
    if (existing) {
      await fetch(`/api/scores/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    loadExistingScores();
    setSavingPlayerId("");
  }

  return (
    <ModuleShell title={t("Scores & Votes")} description={t("Review matchday points and vote-based scoring summaries.")}>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Season")}</span>
          <select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
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
          <select
            value={matchdayNumber}
            onChange={(event) => setMatchdayNumber(Number(event.target.value))}
            className="w-28 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          >
            {Array.from({ length: maxMatchday }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SectionCard
        title={t("Sync results from leghe.fantacalcio.it")}
        description={t("Fetch fantapunti, goals and match outcome for all calculated matchdays.")}
      >
        <form onSubmit={handleSyncResults} className="flex flex-wrap items-end gap-3">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Competition ID")}</span>
            <input
              value={competitionId}
              onChange={(event) => setCompetitionId(event.target.value)}
              placeholder="26549"
              className="w-32 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <button
            type="submit"
            disabled={syncing}
            className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
          >
            {syncing ? t("Syncing") + "..." : t("Sync")}
          </button>
        </form>
        {syncError && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {syncError}
          </p>
        )}
        {syncResult && (
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("Fixtures updated")}: {syncResult.updated}.{" "}
            {syncResult.notMatched.length > 0 && `${t("Not matched")}: ${syncResult.notMatched.join("; ")}`}
          </p>
        )}
      </SectionCard>

      <SectionCard title={t("Fixtures")} description={t("Matches for this matchday.")}>
        <div className="space-y-3">
          {fixtures.map((fixture) => (
            <div
              key={fixture.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex flex-1 items-center justify-center gap-3">
                <span className="flex-1 text-right text-sm font-semibold text-ink">
                  {fixture.homeName ?? "—"}
                </span>

                <div className="flex flex-col items-center">
                  <input
                    key={`gh-${fixture.id}-${fixture.goalsHome}`}
                    type="number"
                    defaultValue={fixture.goalsHome ?? ""}
                    onBlur={(event) => handleFixtureScoreBlur(fixture.id, "goalsHome", event.target.value)}
                    title={t("Goals")}
                    className="w-12 rounded-lg bg-transparent text-center text-xl font-bold text-ink outline-none focus:bg-surface-alt"
                  />
                  <input
                    type="number"
                    defaultValue={fixture.scoreHome ?? ""}
                    onBlur={(event) => handleFixtureScoreBlur(fixture.id, "scoreHome", event.target.value)}
                    title={t("FV")}
                    className="w-12 rounded-lg bg-transparent text-center text-xs text-ink-muted outline-none focus:bg-surface-alt"
                  />
                </div>

                <span className="text-ink-muted">—</span>

                <div className="flex flex-col items-center">
                  <input
                    key={`ga-${fixture.id}-${fixture.goalsAway}`}
                    type="number"
                    defaultValue={fixture.goalsAway ?? ""}
                    onBlur={(event) => handleFixtureScoreBlur(fixture.id, "goalsAway", event.target.value)}
                    title={t("Goals")}
                    className="w-12 rounded-lg bg-transparent text-center text-xl font-bold text-ink outline-none focus:bg-surface-alt"
                  />
                  <input
                    type="number"
                    defaultValue={fixture.scoreAway ?? ""}
                    onBlur={(event) => handleFixtureScoreBlur(fixture.id, "scoreAway", event.target.value)}
                    title={t("FV")}
                    className="w-12 rounded-lg bg-transparent text-center text-xs text-ink-muted outline-none focus:bg-surface-alt"
                  />
                </div>

                <span className="flex-1 text-left text-sm font-semibold text-ink">
                  {fixture.awayName ?? "—"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  title={t(fixture.status)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    fixture.status === "played"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-surface-alt text-ink-muted"
                  }`}
                >
                  <Check size={16} />
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteFixture(fixture.id)}
                  title={t("Remove")}
                  aria-label={t("Remove")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          {fixtures.length === 0 && <p className="text-sm text-ink-muted">{t("No data yet")}</p>}
        </div>

        <form onSubmit={handleCreateFixture} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Home")}</span>
            <select
              value={newHome}
              onChange={(event) => setNewHome(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            >
              <option value="">{t("Select a fantasy team")}</option>
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Away")}</span>
            <select
              value={newAway}
              onChange={(event) => setNewAway(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            >
              <option value="">{t("Select a fantasy team")}</option>
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!newHome || !newAway || newHome === newAway}
            className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-40"
          >
            {t("Add fixture")}
          </button>
        </form>
      </SectionCard>

      <SectionCard title={t("Player stats")} description={t("Enter raw stats, fantavoto is calculated automatically.")}>
        <label className="mb-4 block space-y-2 text-sm text-ink">
          <span>{t("Fantasy team")}</span>
          <select
            value={statsRosterId}
            onChange={(event) => setStatsRosterId(event.target.value)}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure md:w-auto"
          >
            <option value="">{t("Select a fantasy team")}</option>
            {rosters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        {rosterDetail && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-ink">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-2 py-2">{t("Player")}</th>
                  <th className="px-2 py-2">{t("Vote")}</th>
                  <th className="px-2 py-2">{t("Goals")}</th>
                  <th className="px-2 py-2">{t("Assists")}</th>
                  <th className="px-2 py-2">{t("Yellow cards")}</th>
                  <th className="px-2 py-2">{t("Red cards")}</th>
                  <th className="px-2 py-2">{t("Penalties saved")}</th>
                  <th className="px-2 py-2">{t("Penalties missed")}</th>
                  <th className="px-2 py-2">{t("Own goals")}</th>
                  <th className="px-2 py-2">{t("Clean sheet")}</th>
                  <th className="px-2 py-2">{t("Fantavoto")}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rosterDetail.players.map((p) => {
                  const form = forms[p.playerId] ?? emptyForm;
                  const existing = existingByPlayer.get(p.playerId);
                  return (
                    <tr key={p.playerId} className="border-t border-line">
                      <td className="px-2 py-2 text-ink">
                        {p.fullName} <span className="text-xs text-ink-muted">({t(p.position)})</span>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.5"
                          value={form.vote}
                          onChange={(e) => updateForm(p.playerId, { vote: e.target.value })}
                          className="w-16 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={form.goals}
                          onChange={(e) => updateForm(p.playerId, { goals: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={form.assists}
                          onChange={(e) => updateForm(p.playerId, { assists: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={form.yellowCards}
                          onChange={(e) => updateForm(p.playerId, { yellowCards: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={form.redCards}
                          onChange={(e) => updateForm(p.playerId, { redCards: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          disabled={p.position !== "GK"}
                          value={form.penaltiesSaved}
                          onChange={(e) => updateForm(p.playerId, { penaltiesSaved: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink disabled:opacity-30"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={form.penaltiesMissed}
                          onChange={(e) => updateForm(p.playerId, { penaltiesMissed: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={form.ownGoals}
                          onChange={(e) => updateForm(p.playerId, { ownGoals: e.target.value })}
                          className="w-14 rounded-lg border border-line bg-surface-alt px-2 py-1 text-ink"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          disabled={p.position !== "GK"}
                          checked={form.cleanSheet}
                          onChange={(e) => updateForm(p.playerId, { cleanSheet: e.target.checked })}
                          className="h-4 w-4 disabled:opacity-30"
                        />
                      </td>
                      <td className="px-2 py-2 font-semibold text-azure-deep">{existing?.score ?? "—"}</td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleSavePlayer(p.playerId)}
                          disabled={savingPlayerId === p.playerId}
                          className="rounded-lg bg-azure px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
                        >
                          {t("Save")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </ModuleShell>
  );
}
