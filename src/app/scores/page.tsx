"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { RoleBadge } from "../../components/role-badge";
import { useTranslation } from "../../lib/i18n";
import { cupRoundLabelKey } from "../../lib/cup";

type Season = { id: string; name: string; status: string };
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
type LineupPlayerRow = {
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  playedNoVote: boolean;
  vote: string | null;
  score: string | null;
};

function VoteCell({ p, t }: { p: LineupPlayerRow; t: (key: string) => string }) {
  if (p.vote) {
    return (
      <>
        {p.vote} {p.score && <span className="font-semibold text-azure-deep">({p.score})</span>}
      </>
    );
  }
  return <>{p.playedNoVote ? t("s.v.") : "—"}</>;
}
type Lineup = {
  rosterId: string;
  rosterName: string | null;
  formation: string | null;
  starters: LineupPlayerRow[];
  bench: LineupPlayerRow[];
};

const roleOrder: Record<LineupPlayerRow["position"], number> = { GK: 0, DF: 1, MF: 2, FW: 3 };
function byRole(a: LineupPlayerRow, b: LineupPlayerRow) {
  return roleOrder[a.position] - roleOrder[b.position];
}

function LineupPanel({
  lineup,
  fallbackName,
  t,
}: {
  lineup: Lineup | undefined;
  fallbackName: string | null;
  t: (key: string) => string;
}) {
  if (!lineup) {
    return (
      <div className="rounded-xl border border-line bg-surface-alt p-3 text-sm text-ink-muted">
        <p className="font-semibold text-ink">{fallbackName ?? "—"}</p>
        <p className="mt-1">{t("No lineup submitted yet.")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-alt p-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">{lineup.rosterName ?? fallbackName ?? "—"}</p>
        {lineup.formation && (
          <span className="rounded-full bg-azure-soft px-2 py-0.5 text-[11px] font-bold text-azure-deep">
            {lineup.formation}
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {[...lineup.starters].sort(byRole).map((p) => (
          <li key={p.playerId} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-ink">
              <RoleBadge position={p.position} t={t} />
              {p.fullName}
            </span>
            <span className="font-mono-data text-ink-muted">
              <VoteCell p={p} t={t} />
            </span>
          </li>
        ))}
      </ul>
      {lineup.bench.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-ink-muted">{t("Bench")}</summary>
          <ul className="mt-1 space-y-1">
            {[...lineup.bench].sort(byRole).map((p) => (
              <li key={p.playerId} className="flex items-center justify-between gap-2 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <RoleBadge position={p.position} t={t} size="sm" />
                  {p.fullName}
                </span>
                <span className="font-mono-data">
                  <VoteCell p={p} t={t} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Cup fixtures are entirely machine-managed (sync-cup-calendar creates them,
// sync-lineups fills in formations/votes) — no manual score editing or
// delete button, just the same readonly scoreline + lineups toggle already
// used for league fixtures, without the editable inputs.
function CupFixtureCard({
  fixture,
  lineups,
  isOpen,
  onToggle,
  t,
}: {
  fixture: Fixture;
  lineups: Lineup[];
  isOpen: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-azure-deep">
        {t(cupRoundLabelKey(fixture.matchdayNumber))}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:flex-1">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="flex min-h-10 items-center break-words text-sm font-semibold text-ink">
              {fixture.homeName ?? "—"}
            </span>
            <span className="text-xl font-bold text-ink">{fixture.goalsHome ?? "-"}</span>
            <span className="text-xs text-ink-muted">{fixture.scoreHome ?? "—"}</span>
          </div>
          <span className="pt-10 text-ink-muted">—</span>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="flex min-h-10 items-center break-words text-sm font-semibold text-ink">
              {fixture.awayName ?? "—"}
            </span>
            <span className="text-xl font-bold text-ink">{fixture.goalsAway ?? "-"}</span>
            <span className="text-xs text-ink-muted">{fixture.scoreAway ?? "—"}</span>
          </div>
        </div>
        <span
          title={t(fixture.status)}
          className={`flex h-8 w-8 items-center justify-center self-center rounded-full sm:self-auto ${
            fixture.status === "played" ? "bg-emerald-50 text-emerald-700" : "bg-surface-alt text-ink-muted"
          }`}
        >
          <Check size={16} />
        </span>
      </div>

      <button type="button" onClick={onToggle} className="mt-3 text-xs font-semibold text-azure transition hover:text-azure-deep">
        {isOpen ? t("Hide lineups") : t("Show lineups")}
      </button>

      {isOpen && (
        <div className="mt-3 grid gap-4 border-t border-line pt-3 sm:grid-cols-2">
          <LineupPanel lineup={lineups.find((l) => l.rosterId === fixture.rosterIdHome)} fallbackName={fixture.homeName} t={t} />
          <LineupPanel lineup={lineups.find((l) => l.rosterId === fixture.rosterIdAway)} fallbackName={fixture.awayName} t={t} />
        </div>
      )}
    </div>
  );
}

export default function ScoresPage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [matchdayNumber, setMatchdayNumber] = useState(1);
  const [maxMatchday, setMaxMatchday] = useState(38);

  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [openLineupFixtureId, setOpenLineupFixtureId] = useState("");

  const [cupFixtures, setCupFixtures] = useState<Fixture[]>([]);
  const [cupLineups, setCupLineups] = useState<Lineup[]>([]);
  const [openCupLineupFixtureId, setOpenCupLineupFixtureId] = useState("");

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data: Season[]) => {
        setSeasons(data);
        const active = data.find((s) => s.status === "active") ?? data[0];
        if (active) setSeasonId(active.id);
      });
  }, []);

  // Matchday selector: default to the current matchday (same logic as the
  // top ticker — last played, or the next one if its lineups are already
  // locked) and cap the dropdown at however many matchdays this season's
  // calendar actually has.
  useEffect(() => {
    if (!seasonId) return;
    fetch(`/api/fixtures/current-matchday?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then((data: { matchday: number; maxMatchday: number }) => {
        setMaxMatchday(data.maxMatchday);
        setMatchdayNumber(data.matchday);
      });
  }, [seasonId]);

  function loadFixtures() {
    if (!seasonId) return;
    fetch(`/api/fixtures?seasonId=${seasonId}&matchdayNumber=${matchdayNumber}`)
      .then((res) => res.json())
      .then(setFixtures);
  }

  useEffect(loadFixtures, [seasonId, matchdayNumber]);

  // Fixtures/results are entirely machine-managed now — re-sync from
  // leghe.fantacalcio.it every time the page loads instead of a manual
  // button. Season-wide (covers every calculated matchday in one call), so
  // it only needs to re-run when the season changes.
  useEffect(() => {
    if (!seasonId) return;
    fetch("/api/fixtures/sync-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId }),
    })
      .then(() => loadFixtures())
      .catch(() => null);
  }, [seasonId]);

  function loadLineups() {
    if (!seasonId) return;
    fetch(`/api/lineups?seasonId=${seasonId}&matchdayNumber=${matchdayNumber}`)
      .then((res) => res.json())
      .then(setLineups);
  }

  // "Voti in live": re-sync formations + fantacalcio.it's own live fantavoto
  // for the current matchday every time the page loads, no manual button.
  // Cheap (a handful of requests, see sync-lineups route), never blocks the
  // page — fixtures/lineups already show whatever's in the DB, this just
  // refreshes it in the background.
  useEffect(() => {
    if (!seasonId || !matchdayNumber) return;
    loadLineups();
    fetch("/api/scores/sync-lineups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, matchdayNumber }),
    })
      .then(() => loadLineups())
      .catch(() => null);
  }, [seasonId, matchdayNumber]);

  // Coppa runs every few campionato matchdays (quarti alla 7, ritorno alla
  // 14, ecc.) — the fixture calendar is entirely machine-managed, so every
  // page load re-syncs it, then checks whether a cup round happens to fall
  // on the currently selected matchday and, if so, syncs its lineups/votes
  // too. Most matchdays have no cup round: the section below simply stays
  // empty.
  useEffect(() => {
    if (!seasonId || !matchdayNumber) return;
    let cancelled = false;

    async function syncCup() {
      await fetch("/api/fixtures/sync-cup-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId }),
      }).catch(() => null);

      const fixturesRes = await fetch(
        `/api/fixtures?seasonId=${seasonId}&competition=cup&linkedMatchdayNumber=${matchdayNumber}`
      ).then((res) => res.json() as Promise<Fixture[]>);
      if (cancelled) return;
      setCupFixtures(fixturesRes);

      const cupRound = fixturesRes[0]?.matchdayNumber;
      if (cupRound === undefined) {
        setCupLineups([]);
        return;
      }

      await fetch("/api/scores/sync-lineups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, matchdayNumber: cupRound, competition: "cup" }),
      }).catch(() => null);

      const lineupsRes = await fetch(
        `/api/lineups?seasonId=${seasonId}&matchdayNumber=${cupRound}&competition=cup`
      ).then((res) => res.json() as Promise<Lineup[]>);
      if (!cancelled) setCupLineups(lineupsRes);
    }

    syncCup();
    return () => {
      cancelled = true;
    };
  }, [seasonId, matchdayNumber]);

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

  return (
    <ModuleShell title={t("Results & Votes")} description={t("Review matchday results and vote-based scoring summaries.")}>
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

      <SectionCard title={t("Fixtures")} description={t("Matches for this matchday.")}>
        <div className="space-y-3">
          {fixtures.map((fixture) => (
            <div key={fixture.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:flex-1">
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="flex min-h-20 items-center break-words text-sm font-semibold text-ink">
                    {fixture.homeName ?? "—"}
                  </span>
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

                <span className="pt-20 text-ink-muted">—</span>

                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="flex min-h-20 items-center break-words text-sm font-semibold text-ink">
                    {fixture.awayName ?? "—"}
                  </span>
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
              </div>

              <span
                title={t(fixture.status)}
                className={`flex h-8 w-8 items-center justify-center self-center rounded-full sm:self-auto ${
                  fixture.status === "played"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-surface-alt text-ink-muted"
                }`}
              >
                <Check size={16} />
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpenLineupFixtureId((current) => (current === fixture.id ? "" : fixture.id))
              }
              className="mt-3 text-xs font-semibold text-azure transition hover:text-azure-deep"
            >
              {openLineupFixtureId === fixture.id ? t("Hide lineups") : t("Show lineups")}
            </button>

            {openLineupFixtureId === fixture.id && (
              <div className="mt-3 grid gap-4 border-t border-line pt-3 sm:grid-cols-2">
                <LineupPanel
                  lineup={lineups.find((l) => l.rosterId === fixture.rosterIdHome)}
                  fallbackName={fixture.homeName}
                  t={t}
                />
                <LineupPanel
                  lineup={lineups.find((l) => l.rosterId === fixture.rosterIdAway)}
                  fallbackName={fixture.awayName}
                  t={t}
                />
              </div>
            )}
            </div>
          ))}
          {fixtures.length === 0 && <p className="text-sm text-ink-muted">{t("No data yet")}</p>}
        </div>
      </SectionCard>

      {cupFixtures.length > 0 && (
        <SectionCard title={t("Cup")} description={t("Cup fixtures for this matchday.")}>
          <div className="space-y-3">
            {cupFixtures.map((fixture) => (
              <CupFixtureCard
                key={fixture.id}
                fixture={fixture}
                lineups={cupLineups}
                isOpen={openCupLineupFixtureId === fixture.id}
                onToggle={() =>
                  setOpenCupLineupFixtureId((current) => (current === fixture.id ? "" : fixture.id))
                }
                t={t}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </ModuleShell>
  );
}
