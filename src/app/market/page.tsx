"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";

type Season = { id: string; name: string; status: string };
type SessionType = "initial_auction" | "repair_summer" | "repair_winter" | "open_market";
type MarketSession = {
  id: string;
  seasonId: string;
  type: SessionType;
  label: string;
  startDate: string | null;
  endDate: string | null;
};

const TYPE_LABELS: Record<SessionType, string> = {
  initial_auction: "Initial auction",
  repair_summer: "Summer repair market",
  repair_winter: "Winter repair market",
  open_market: "Open market",
};

const DEFAULT_LABELS: Record<SessionType, string> = {
  initial_auction: "Asta ufficiale",
  repair_summer: "Riparazione estiva",
  repair_winter: "Riparazione invernale",
  open_market: "Mercato aperto",
};

function sessionStatus(session: MarketSession): "ongoing" | "scheduled" | "ended" {
  const now = new Date();
  const start = session.startDate ? new Date(session.startDate) : null;
  const end = session.endDate ? new Date(session.endDate) : null;
  if (start && now < start) return "scheduled";
  if (end && now > end) return "ended";
  return "ongoing";
}

const STATUS_DOT: Record<string, string> = {
  ongoing: "bg-emerald-500",
  scheduled: "bg-azure",
  ended: "bg-line",
};
const STATUS_TEXT: Record<string, string> = {
  ongoing: "text-emerald-700",
  scheduled: "text-azure-deep",
  ended: "text-ink-muted",
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function MarketPage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [sessions, setSessions] = useState<MarketSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [newType, setNewType] = useState<SessionType>("initial_auction");
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
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

  function loadSessions() {
    if (!seasonId) return;
    setLoading(true);
    fetch(`/api/market?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then((data: MarketSession[]) =>
        setSessions([...data].sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? "")))
      )
      .finally(() => setLoading(false));
  }

  useEffect(loadSessions, [seasonId]);

  const marketOpen = useMemo(() => sessions.some((s) => sessionStatus(s) === "ongoing"), [sessions]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!seasonId) return;
    setSaving(true);
    await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        type: newType,
        label: newLabel.trim() || DEFAULT_LABELS[newType],
        startDate: newStart || null,
        endDate: newEnd || null,
      }),
    });
    setNewLabel("");
    setNewStart("");
    setNewEnd("");
    loadSessions();
    setSaving(false);
  }

  async function handleDateBlur(sessionId: string, field: "startDate" | "endDate", value: string) {
    await fetch(`/api/market/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    loadSessions();
  }

  async function handleDelete(sessionId: string) {
    if (!confirm(t("Delete this market session?"))) return;
    await fetch(`/api/market/${sessionId}`, { method: "DELETE" });
    loadSessions();
  }

  return (
    <ModuleShell
      title={t("Market")}
      description={t("Track transfer sessions, movement windows and market activity.")}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.15em] ${
            marketOpen
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-line bg-surface-alt text-ink-muted"
          }`}
        >
          {marketOpen ? t("Market open") : t("Market closed")}
        </span>
        <Link
          href="/market/trades"
          className="rounded-2xl border border-azure/20 bg-azure-soft px-4 py-2 text-sm font-semibold text-azure-deep transition hover:bg-azure/10"
        >
          {t("Trades")}
        </Link>
      </div>

      <label className="mb-4 block space-y-2 text-sm text-ink">
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

      <SectionCard title={t("Market sessions")} description={t("All auction and repair windows for this season.")}>
        {loading ? (
          <p className="text-sm text-ink-muted">{t("Loading")}...</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const status = sessionStatus(session);
              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{session.label}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{t(TYPE_LABELS[session.type])}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      defaultValue={toDateInputValue(session.startDate)}
                      onBlur={(event) => handleDateBlur(session.id, "startDate", event.target.value)}
                      className="rounded-xl border border-line bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-azure"
                    />
                    <span className="text-ink-muted">→</span>
                    <input
                      type="date"
                      defaultValue={toDateInputValue(session.endDate)}
                      onBlur={(event) => handleDateBlur(session.id, "endDate", event.target.value)}
                      className="rounded-xl border border-line bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-azure"
                    />
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${STATUS_TEXT[status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
                      {t(status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(session.id)}
                      title={t("Remove")}
                      aria-label={t("Remove")}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && <p className="text-sm text-ink-muted">{t("No data yet")}</p>}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Type")}</span>
            <select
              value={newType}
              onChange={(event) => setNewType(event.target.value as SessionType)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            >
              <option value="initial_auction">{t(TYPE_LABELS.initial_auction)}</option>
              <option value="repair_summer">{t(TYPE_LABELS.repair_summer)}</option>
              <option value="repair_winter">{t(TYPE_LABELS.repair_winter)}</option>
              <option value="open_market">{t(TYPE_LABELS.open_market)}</option>
            </select>
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Session label")}</span>
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder={DEFAULT_LABELS[newType]}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Start date")}</span>
            <input
              type="date"
              value={newStart}
              onChange={(event) => setNewStart(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("End date")}</span>
            <input
              type="date"
              value={newEnd}
              onChange={(event) => setNewEnd(event.target.value)}
              className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none focus:border-azure"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !seasonId}
            className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-50"
          >
            {saving ? t("Saving") + "..." : t("Create session")}
          </button>
        </form>
      </SectionCard>
    </ModuleShell>
  );
}
