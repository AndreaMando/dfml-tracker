"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";

type Season = { id: string; name: string; status: string };
type Participant = { id: string; seasonId: string; displayName: string; isActive: boolean | null };
type Roster = { id: string; seasonId: string; name: string | null };
type FinancialTransactionType =
  | "registration_league"
  | "fine_late_lineup"
  | "abandonment_clause"
  | "prize"
  | "adjustment";
type Transaction = {
  id: string;
  seasonId: string;
  participantId: string | null;
  type: FinancialTransactionType;
  amount: string;
  description: string | null;
};
type StandingsPenalty = {
  id: string;
  seasonId: string;
  rosterId: string;
  points: number;
  reason: string | null;
};
type BonusRule = { rank: number; bonus: number };

const FINE_TYPES: { value: FinancialTransactionType; label: string; defaultAmount: number }[] = [
  { value: "fine_late_lineup", label: "Formazione non inviata", defaultAmount: 5 },
  { value: "abandonment_clause", label: "Abbandono (quota + multa)", defaultAmount: 50 },
  { value: "adjustment", label: "Altro (importo libero)", defaultAmount: 0 },
];

export default function FinancePage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [participantId, setParticipantId] = useState("");
  const [fineType, setFineType] = useState<FinancialTransactionType>("fine_late_lineup");
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [penalties, setPenalties] = useState<StandingsPenalty[]>([]);
  const [penaltiesLoading, setPenaltiesLoading] = useState(true);
  const [penaltyRosterId, setPenaltyRosterId] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState("1");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [savingPenalty, setSavingPenalty] = useState(false);

  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);
  const [bonusLoading, setBonusLoading] = useState(true);
  const [savingBonus, setSavingBonus] = useState(false);

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
    fetch("/api/participants")
      .then((res) => res.json())
      .then((data: Participant[]) => setParticipants(data.filter((p) => p.seasonId === seasonId)));
    fetch("/api/rosters")
      .then((res) => res.json())
      .then((data: Roster[]) => setRosters(data.filter((r) => r.seasonId === seasonId)));
  }, [seasonId]);

  function loadTransactions() {
    if (!seasonId) return;
    setLoading(true);
    fetch(`/api/finance?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then(setTransactions)
      .finally(() => setLoading(false));
  }

  useEffect(loadTransactions, [seasonId]);

  function loadPenalties() {
    if (!seasonId) return;
    setPenaltiesLoading(true);
    fetch(`/api/standings-penalties?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then(setPenalties)
      .finally(() => setPenaltiesLoading(false));
  }

  useEffect(loadPenalties, [seasonId]);

  function loadBonusRules() {
    if (!seasonId) return;
    setBonusLoading(true);
    fetch(`/api/seasons/${seasonId}/credits-bonus`)
      .then((res) => res.json())
      .then((data: { rules: BonusRule[] }) => setBonusRules(data.rules))
      .finally(() => setBonusLoading(false));
  }

  useEffect(loadBonusRules, [seasonId]);

  const finesByParticipant = useMemo(() => {
    const fineTypeSet = new Set(["fine_late_lineup", "abandonment_clause"]);
    const map = new Map<string, { total: number; entries: Transaction[] }>();
    for (const p of participants) map.set(p.id, { total: 0, entries: [] });
    for (const tx of transactions) {
      if (!tx.participantId || !fineTypeSet.has(tx.type)) continue;
      const bucket = map.get(tx.participantId);
      if (!bucket) continue;
      bucket.total += Number(tx.amount);
      bucket.entries.push(tx);
    }
    return map;
  }, [transactions, participants]);

  const penaltiesByRoster = useMemo(() => {
    const map = new Map<string, { total: number; entries: StandingsPenalty[] }>();
    for (const r of rosters) map.set(r.id, { total: 0, entries: [] });
    for (const p of penalties) {
      const bucket = map.get(p.rosterId);
      if (!bucket) continue;
      bucket.total += p.points;
      bucket.entries.push(p);
    }
    return map;
  }, [penalties, rosters]);

  async function handleAddFine(event: React.FormEvent) {
    event.preventDefault();
    if (!participantId || !seasonId) return;
    setSaving(true);
    await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        participantId,
        type: fineType,
        amount,
        description: note || null,
      }),
    });
    setNote("");
    loadTransactions();
    setSaving(false);
  }

  async function handleDeleteTx(id: string) {
    if (!confirm(t("Delete this transaction?"))) return;
    await fetch(`/api/finance/${id}`, { method: "DELETE" });
    loadTransactions();
  }

  async function handleAddPenalty(event: React.FormEvent) {
    event.preventDefault();
    if (!penaltyRosterId || !seasonId) return;
    setSavingPenalty(true);
    await fetch("/api/standings-penalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        rosterId: penaltyRosterId,
        points: penaltyPoints,
        reason: penaltyReason || null,
      }),
    });
    setPenaltyReason("");
    loadPenalties();
    setSavingPenalty(false);
  }

  async function handleDeletePenalty(id: string) {
    if (!confirm(t("Delete this penalty?"))) return;
    await fetch(`/api/standings-penalties/${id}`, { method: "DELETE" });
    loadPenalties();
  }

  function handleBonusChange(rank: number, bonus: string) {
    setBonusRules((prev) => prev.map((r) => (r.rank === rank ? { ...r, bonus: Number(bonus) } : r)));
  }

  async function handleSaveBonus() {
    if (!seasonId) return;
    setSavingBonus(true);
    await fetch(`/api/seasons/${seasonId}/credits-bonus`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: bonusRules }),
    });
    setSavingBonus(false);
  }

  return (
    <ModuleShell title={t("Finance & Penalties")} description={t("Keep track of league fees, prizes, penalties and transaction balance.")}>
      <label className="mb-6 block space-y-2 text-sm text-ink">
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

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("League")}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-alt p-4">
              <p className="text-xs text-ink-muted">{t("Registration fee")}</p>
              <p className="mt-1 text-xl font-bold text-ink">40 €</p>
              <p className="mt-1 text-xs text-ink-muted">{t("Per participant, paid at season start.")}</p>
            </div>
            <div className="rounded-xl bg-surface-alt p-4">
              <p className="text-xs text-ink-muted">{t("Fines")}</p>
              <p className="mt-1 text-sm text-ink">{t("Missed lineup")}: <strong>5 €</strong></p>
              <p className="text-sm text-ink">{t("Abandonment")}: <strong>50 €</strong> ({t("fee + penalty")})</p>
            </div>
            <div className="rounded-xl bg-surface-alt p-4">
              <p className="text-xs text-ink-muted">{t("Prizes")}</p>
              <p className="mt-1 text-sm text-ink">1° <strong>200 €</strong> · 2° <strong>80 €</strong> · 3° <strong>40 €</strong></p>
              <p className="mt-1 text-xs text-ink-muted">{t("Based on final standings, fines not deducted.")}</p>
            </div>
            <details className="group rounded-xl bg-surface-alt p-4">
              <summary className="cursor-pointer list-none text-xs text-ink-muted">
                {t("End-of-season bonus credits")}
                <span className="ml-1 text-azure-deep group-open:hidden">({t("Edit")})</span>
              </summary>
              {bonusLoading ? (
                <p className="mt-2 text-sm text-ink-muted">{t("Loading")}...</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {bonusRules.map((rule) => (
                    <label key={rule.rank} className="flex items-center justify-between gap-2 text-sm text-ink">
                      <span>{rule.rank}°</span>
                      <input
                        type="number"
                        value={rule.bonus}
                        onChange={(event) => handleBonusChange(rule.rank, event.target.value)}
                        className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-right text-sm text-ink outline-none focus:border-azure"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={handleSaveBonus}
                    disabled={savingBonus}
                    className="mt-2 w-full rounded-xl bg-azure px-3 py-2 text-xs font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
                  >
                    {savingBonus ? t("Saving") + "..." : t("Save changes")}
                  </button>
                </div>
              )}
            </details>
          </div>
        </SectionCard>

        <SectionCard title={t("Cup")}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-alt p-4">
              <p className="text-xs text-ink-muted">{t("Cup registration fee")}</p>
              <p className="mt-1 text-xl font-bold text-ink">20 €</p>
              <p className="mt-1 text-xs text-ink-muted">{t("Per participant, added on top of the league fee.")}</p>
            </div>
            <div className="rounded-xl bg-surface-alt p-4">
              <p className="text-xs text-ink-muted">{t("Cup prizes")}</p>
              <p className="mt-1 text-sm text-ink">{t("Winner")}: <strong>80 €</strong> · {t("Runner-up")}: <strong>40 €</strong></p>
              <p className="text-sm text-ink">{t("Losing semifinalists")}: <strong>20 €</strong> {t("each")}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t("Fines")} description={t("Total fines owed per fantasy team, entered manually.")}>
        {loading ? (
          <p className="text-sm text-ink-muted">{t("Loading")}...</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="min-w-full text-left text-sm text-ink">
              <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2">{t("Participant")}</th>
                  <th className="px-4 py-2">{t("Total fines")}</th>
                  <th className="px-4 py-2">{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const bucket = finesByParticipant.get(p.id);
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-2 font-medium">{p.displayName}</td>
                      <td
                        className={`px-4 py-2 font-semibold ${
                          bucket?.total ? "text-rose-600" : "text-ink-muted"
                        }`}
                      >
                        {bucket?.total ? `-${bucket.total.toFixed(2)}` : (0).toFixed(2)} €
                      </td>
                      <td className="px-4 py-2 text-xs text-ink-muted">
                        {bucket?.entries.length ? (
                          <ul className="space-y-1">
                            {bucket.entries.map((tx) => (
                              <li key={tx.id} className="flex items-center gap-2">
                                <span>
                                  -{tx.amount} € — {tx.description || t(FINE_TYPES.find((f) => f.value === tx.type)?.label ?? tx.type)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="text-red-500 hover:underline"
                                >
                                  {t("Remove")}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleAddFine} className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Participant")}</span>
            <select
              value={participantId}
              onChange={(event) => setParticipantId(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            >
              <option value="">{t("Select")}</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Type")}</span>
            <select
              value={fineType}
              onChange={(event) => {
                const type = event.target.value as FinancialTransactionType;
                setFineType(type);
                const preset = FINE_TYPES.find((f) => f.value === type);
                if (preset) setAmount(preset.defaultAmount.toString());
              }}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            >
              {FINE_TYPES.map((f) => (
                <option key={f.value} value={f.value}>
                  {t(f.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Amount")} (€)</span>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-28 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Note")}</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
              placeholder={t("e.g. Matchday 4")}
            />
          </label>
          <button
            type="submit"
            disabled={saving || !participantId}
            className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
          >
            {saving ? t("Saving") + "..." : t("Add fine")}
          </button>
        </form>
      </SectionCard>

      <div className="mt-6">
        <SectionCard title={t("Standings penalties")} description={t("Points deducted from a fantasy team's final standings, entered manually.")}>
          {penaltiesLoading ? (
            <p className="text-sm text-ink-muted">{t("Loading")}...</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="min-w-full text-left text-sm text-ink">
                <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2">{t("Team")}</th>
                    <th className="px-4 py-2">{t("Points")}</th>
                    <th className="px-4 py-2">{t("Details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rosters.map((r) => {
                    const bucket = penaltiesByRoster.get(r.id);
                    return (
                      <tr key={r.id} className="border-t border-line">
                        <td className="px-4 py-2 font-medium">{r.name}</td>
                        <td className={`px-4 py-2 font-semibold ${bucket?.total ? "text-rose-600" : "text-ink-muted"}`}>
                          {bucket?.total ? `-${bucket.total}` : 0}
                        </td>
                        <td className="px-4 py-2 text-xs text-ink-muted">
                          {bucket?.entries.length ? (
                            <ul className="space-y-1">
                              {bucket.entries.map((p) => (
                                <li key={p.id} className="flex items-center gap-2">
                                  <span>
                                    -{p.points} {t("Points")} — {p.reason || "—"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePenalty(p.id)}
                                    className="text-red-500 hover:underline"
                                  >
                                    {t("Remove")}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleAddPenalty} className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-5">
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Team")}</span>
              <select
                value={penaltyRosterId}
                onChange={(event) => setPenaltyRosterId(event.target.value)}
                className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
              >
                <option value="">{t("Select")}</option>
                {rosters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Points")}</span>
              <input
                type="number"
                min={1}
                value={penaltyPoints}
                onChange={(event) => setPenaltyPoints(event.target.value)}
                className="w-24 rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Note")}</span>
              <input
                value={penaltyReason}
                onChange={(event) => setPenaltyReason(event.target.value)}
                className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
                placeholder={t("e.g. Missing U21 player")}
              />
            </label>
            <button
              type="submit"
              disabled={savingPenalty || !penaltyRosterId}
              className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
            >
              {savingPenalty ? t("Saving") + "..." : t("Add penalty")}
            </button>
          </form>
        </SectionCard>
      </div>
    </ModuleShell>
  );
}
