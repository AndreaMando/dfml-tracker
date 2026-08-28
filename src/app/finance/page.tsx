"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";

type Season = { id: string; name: string; status: string };
type Participant = { id: string; seasonId: string; displayName: string; isActive: boolean | null };
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

const FINE_TYPES: { value: FinancialTransactionType; label: string; defaultAmount: number }[] = [
  { value: "fine_late_lineup", label: "Formazione non inviata", defaultAmount: -5 },
  { value: "abandonment_clause", label: "Abbandono (quota + multa)", defaultAmount: -50 },
  { value: "adjustment", label: "Altro (importo libero)", defaultAmount: 0 },
];

export default function FinancePage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [participantId, setParticipantId] = useState("");
  const [fineType, setFineType] = useState<FinancialTransactionType>("fine_late_lineup");
  const [amount, setAmount] = useState("-5");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <ModuleShell title={t("Finance")} description={t("Keep track of league fees, prizes and transaction balance.")}>
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

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-muted">{t("Registration fee")}</p>
          <h2 className="mt-2 text-2xl font-bold text-ink">40 €</h2>
          <p className="mt-1 text-xs text-ink-muted">{t("Per participant, paid at season start.")}</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-muted">{t("Fines")}</p>
          <p className="mt-2 text-sm text-ink">{t("Missed lineup")}: <strong>-5 €</strong></p>
          <p className="mt-1 text-sm text-ink">{t("Abandonment")}: <strong>-50 €</strong> ({t("fee + penalty")})</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-muted">{t("Prizes")}</p>
          <p className="mt-2 text-sm text-ink">1° <strong>200 €</strong> · 2° <strong>80 €</strong> · 3° <strong>40 €</strong></p>
          <p className="mt-1 text-xs text-ink-muted">{t("Based on final standings, fines not deducted.")}</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-muted">{t("End-of-season bonus credits")}</p>
          <p className="mt-2 text-sm text-ink">1°–3°: <strong>50</strong></p>
          <p className="text-sm text-ink">4°–5°: <strong>75</strong></p>
          <p className="text-sm text-ink">6°–8°: <strong>100</strong></p>
        </article>
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
                      <td className="px-4 py-2 font-semibold text-rose-600">
                        {(bucket?.total ?? 0).toFixed(2)} €
                      </td>
                      <td className="px-4 py-2 text-xs text-ink-muted">
                        {bucket?.entries.length ? (
                          <ul className="space-y-1">
                            {bucket.entries.map((tx) => (
                              <li key={tx.id} className="flex items-center gap-2">
                                <span>
                                  {tx.amount} € — {tx.description || t(FINE_TYPES.find((f) => f.value === tx.type)?.label ?? tx.type)}
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
    </ModuleShell>
  );
}
