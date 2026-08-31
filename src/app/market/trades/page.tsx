"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../../components/module-shell";
import { SectionCard } from "../../../components/section-card";
import { useTranslation } from "../../../lib/i18n";

type Roster = { id: string; name: string | null; seasonId: string };
type CompositionRow = {
  playerId: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
};
type RosterDetail = { id: string; seasonId: string; players: CompositionRow[] };

type TradeHistoryRow = {
  id: string;
  createdAt: string;
  rosterIdA: string;
  rosterIdB: string;
  rosterAName: string | null;
  rosterBName: string | null;
  creditsDeltaA: string | null;
  creditsDeltaB: string | null;
  players: { playerId: string; fullName: string; fromRosterId: string; toRosterId: string }[];
};

function TeamColumn({
  label,
  rosters,
  excludeId,
  rosterId,
  onRosterChange,
  roster,
  selected,
  onToggle,
  creditsDelta,
  onCreditsChange,
}: {
  label: string;
  rosters: Roster[];
  excludeId: string;
  rosterId: string;
  onRosterChange: (id: string) => void;
  roster: RosterDetail | null;
  selected: Set<string>;
  onToggle: (playerId: string) => void;
  creditsDelta: string;
  onCreditsChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-azure-deep">{label}</p>
        <select
          value={rosterId}
          onChange={(event) => onRosterChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
        >
          <option value="">{t("Select a fantasy team")}</option>
          {rosters
            .filter((r) => r.id !== excludeId)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex-1 space-y-2">
        {roster?.players.map((p) => (
          <label
            key={p.playerId}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm transition ${
              selected.has(p.playerId)
                ? "border-azure bg-azure/15 text-azure-deep"
                : "border-line bg-surface-alt text-ink hover:border-azure/40"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(p.playerId)}
                onChange={() => onToggle(p.playerId)}
                className="h-4 w-4 rounded border-line bg-surface-alt"
              />
              {p.fullName}
            </span>
            <span className="text-xs text-ink-muted">
              {t(p.position)} • {p.teamName ?? "—"}
            </span>
          </label>
        ))}
        {roster && roster.players.length === 0 && (
          <p className="text-sm text-ink-muted">{t("No data yet")}</p>
        )}
      </div>

      <label className="block space-y-2 text-sm text-ink">
        <span>{t("Credits adjustment")}</span>
        <input
          type="number"
          value={creditsDelta}
          onChange={(event) => onCreditsChange(event.target.value)}
          placeholder="0"
          className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
        />
      </label>
    </div>
  );
}

export default function TradesPage() {
  const { t } = useTranslation();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [rosterIdA, setRosterIdA] = useState("");
  const [rosterIdB, setRosterIdB] = useState("");
  const [rosterA, setRosterA] = useState<RosterDetail | null>(null);
  const [rosterB, setRosterB] = useState<RosterDetail | null>(null);
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());
  const [creditsDeltaA, setCreditsDeltaA] = useState("");
  const [creditsDeltaB, setCreditsDeltaB] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<TradeHistoryRow[]>([]);

  useEffect(() => {
    fetch("/api/rosters")
      .then((res) => res.json())
      .then(setRosters);
    loadHistory();
  }, []);

  function loadHistory() {
    fetch("/api/trades")
      .then((res) => res.json())
      .then(setHistory);
  }

  useEffect(() => {
    setSelectedA(new Set());
    if (!rosterIdA) {
      setRosterA(null);
      return;
    }
    fetch(`/api/rosters/${rosterIdA}`)
      .then((res) => res.json())
      .then(setRosterA);
  }, [rosterIdA]);

  useEffect(() => {
    setSelectedB(new Set());
    if (!rosterIdB) {
      setRosterB(null);
      return;
    }
    fetch(`/api/rosters/${rosterIdB}`)
      .then((res) => res.json())
      .then(setRosterB);
  }, [rosterIdB]);

  const canConfirm = useMemo(
    () =>
      !!rosterIdA &&
      !!rosterIdB &&
      rosterIdA !== rosterIdB &&
      (selectedA.size > 0 || selectedB.size > 0),
    [rosterIdA, rosterIdB, selectedA, selectedB]
  );

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, playerId: string) {
    const next = new Set(set);
    if (next.has(playerId)) next.delete(playerId);
    else next.add(playerId);
    setter(next);
  }

  async function handleConfirm() {
    if (!canConfirm || !rosterA || !rosterB) return;
    setSaving(true);
    await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId: rosterA.seasonId,
        rosterIdA,
        rosterIdB,
        playersFromA: Array.from(selectedA),
        playersFromB: Array.from(selectedB),
        creditsDeltaA: creditsDeltaA || null,
        creditsDeltaB: creditsDeltaB || null,
      }),
    });
    setSelectedA(new Set());
    setSelectedB(new Set());
    setCreditsDeltaA("");
    setCreditsDeltaB("");
    const [freshA, freshB] = await Promise.all([
      fetch(`/api/rosters/${rosterIdA}`).then((res) => res.json()),
      fetch(`/api/rosters/${rosterIdB}`).then((res) => res.json()),
    ]);
    setRosterA(freshA);
    setRosterB(freshB);
    loadHistory();
    setSaving(false);
  }

  return (
    <ModuleShell
      title={t("Trades")}
      description={t("Record a trade between two fantasy teams.")}
      backHref="/market"
      backLabel={t("Back to market")}
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <TeamColumn
          label={t("Team A")}
          rosters={rosters}
          excludeId={rosterIdB}
          rosterId={rosterIdA}
          onRosterChange={setRosterIdA}
          roster={rosterA}
          selected={selectedA}
          onToggle={(id) => toggle(selectedA, setSelectedA, id)}
          creditsDelta={creditsDeltaA}
          onCreditsChange={setCreditsDeltaA}
        />
        <TeamColumn
          label={t("Team B")}
          rosters={rosters}
          excludeId={rosterIdA}
          rosterId={rosterIdB}
          onRosterChange={setRosterIdB}
          roster={rosterB}
          selected={selectedB}
          onToggle={(id) => toggle(selectedB, setSelectedB, id)}
          creditsDelta={creditsDeltaB}
          onCreditsChange={setCreditsDeltaB}
        />
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled={!canConfirm || saving}
          onClick={handleConfirm}
          className="rounded-2xl bg-azure px-8 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? t("Saving") + "..." : t("Confirm trade")}
        </button>
      </div>

      <SectionCard title={t("Trade history")} description={t("Trades recorded so far.")}>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("No data yet")}</p>
        ) : (
          <div className="space-y-3">
            {history.map((trade) => (
              <div key={trade.id} className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-ink">
                    {trade.rosterAName} ⇄ {trade.rosterBName}
                  </strong>
                  <span className="text-xs text-ink-muted">
                    {new Date(trade.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-ink-muted">
                  {trade.players.map((p) => (
                    <span key={p.playerId}>
                      {p.fullName} — {p.fromRosterId === trade.rosterIdA ? trade.rosterAName : trade.rosterBName}
                      {" → "}
                      {p.toRosterId === trade.rosterIdA ? trade.rosterAName : trade.rosterBName}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-ink-muted">
                  {trade.creditsDeltaA && <span>{trade.rosterAName}: {trade.creditsDeltaA}</span>}
                  {trade.creditsDeltaB && <span>{trade.rosterBName}: {trade.creditsDeltaB}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </ModuleShell>
  );
}
