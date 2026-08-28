"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

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
  imageUrl: string | null;
  ownerRosterId: string | null;
  ownerRosterName: string | null;
  ownerParticipantName: string | null;
};

const roleStyles: Record<Player["position"], string> = {
  GK: "bg-sky-50 text-sky-700",
  DF: "bg-emerald-50 text-emerald-700",
  MF: "bg-amber-50 text-amber-700",
  FW: "bg-rose-50 text-rose-700",
};

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { t } = useTranslation();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    teamName: "",
    position: "GK" as Player["position"],
    currentValue: "",
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/players/${id}`)
      .then((res) => res.json())
      .then((data: Player) => {
        setPlayer(data);
        setForm({
          fullName: data.fullName ?? "",
          teamName: data.teamName ?? "",
          position: data.position,
          currentValue: data.currentValue ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        teamName: form.teamName,
        position: form.position,
        currentValue: form.currentValue,
      }),
    });
    const updated = await res.json();
    setPlayer((prev) => (prev ? { ...prev, ...updated } : prev));
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(t("Delete this player?"))) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    router.push("/players");
  }

  if (loading) {
    return (
      <ModuleShell title={t("Players")} description="">
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      </ModuleShell>
    );
  }

  if (!player) {
    return (
      <ModuleShell title={t("Players")} description="">
        <p className="text-sm text-ink-muted">{t("Player not found")}</p>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell title={player.fullName} description={t("Player detail")}>
      <PageHeader title={player.fullName} subtitle={`${t(player.position)} • ${player.teamName ?? "—"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${roleStyles[player.position]}`}
          >
            {t(player.position)}
          </span>
          {player.status === "transferred" && (
            <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
              {t("Transferred")}
            </span>
          )}
          {player.ownerRosterName && (
            <Link
              href={`/rosters/${player.ownerRosterId}`}
              className="inline-flex items-center gap-1 rounded-full border border-azure/20 bg-azure-soft px-3 py-1 text-xs font-medium text-azure-deep transition hover:bg-azure/10"
            >
              {t("Owned by")} {player.ownerRosterName}
              {player.ownerParticipantName ? ` (${player.ownerParticipantName})` : ""}
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="mt-6 space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-sm text-ink-muted">{t("Market value")}</p>
              <p className="mt-2 text-xl font-semibold text-ink">{player.currentValue ?? "—"}</p>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-sm text-ink-muted">{t("Initial value")}</p>
              <p className="mt-2 text-xl font-semibold text-ink">{player.initialValue ?? "—"}</p>
            </div>
            <div className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-sm text-ink-muted">FVM</p>
              <p className="mt-2 text-xl font-semibold text-ink">{player.fvm ?? "—"}</p>
            </div>
          </div>

          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.fullName}
              className="aspect-[255/378] w-52 self-center rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-[255/378] w-52 shrink-0 items-center justify-center self-center rounded-2xl border border-dashed border-line text-ink-muted">
              <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSave}
          className="grid gap-5 rounded-3xl border border-line bg-surface p-6 shadow-sm"
        >
          <h3 className="text-base font-semibold text-ink">{t("Edit player")}</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Name")}</span>
              <input
                value={form.fullName}
                onChange={(event) => setForm((f) => ({ ...f, fullName: event.target.value }))}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Team")}</span>
              <input
                value={form.teamName}
                onChange={(event) => setForm((f) => ({ ...f, teamName: event.target.value }))}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              />
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Position")}</span>
              <select
                value={form.position}
                onChange={(event) =>
                  setForm((f) => ({ ...f, position: event.target.value as Player["position"] }))
                }
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              >
                <option value="GK">{t("GK")}</option>
                <option value="DF">{t("DF")}</option>
                <option value="MF">{t("MF")}</option>
                <option value="FW">{t("FW")}</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Market value")}</span>
              <input
                type="number"
                value={form.currentValue}
                onChange={(event) => setForm((f) => ({ ...f, currentValue: event.target.value }))}
                className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
            >
              {saving ? t("Saving") + "..." : t("Save changes")}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              {t("Delete player")}
            </button>
          </div>
        </form>
      </div>
    </ModuleShell>
  );
}
