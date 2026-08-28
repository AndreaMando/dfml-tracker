"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

type Roster = { id: string; name: string | null; creditsRemaining: string | null };

type ParticipantDetail = {
  id: string;
  displayName: string;
  teamName: string | null;
  isActive: boolean | null;
  rosters: Roster[];
};

export default function ParticipantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { t } = useTranslation();

  const [participant, setParticipant] = useState<ParticipantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ displayName: "", teamName: "", isActive: true });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/participants/${id}`)
      .then((res) => res.json())
      .then((data: ParticipantDetail) => {
        setParticipant(data);
        setForm({
          displayName: data.displayName ?? "",
          teamName: data.teamName ?? "",
          isActive: !!data.isActive,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/participants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setParticipant((prev) => (prev ? { ...prev, ...updated } : prev));
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(t("Delete this participant?"))) return;
    await fetch(`/api/participants/${id}`, { method: "DELETE" });
    router.push("/participants");
  }

  if (loading) {
    return (
      <ModuleShell title={t("Participants")} description="">
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      </ModuleShell>
    );
  }

  if (!participant) {
    return (
      <ModuleShell title={t("Participants")} description="">
        <p className="text-sm text-ink-muted">{t("Participant not found")}</p>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell title={participant.displayName} description={t("Participant detail")}>
      <PageHeader
        title={participant.displayName}
        subtitle={participant.teamName ?? "—"}
      />

      <div className="mt-6 space-y-6">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <h3 className="text-base font-semibold text-ink">{t("Rosters")}</h3>
          {participant.rosters.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">{t("No data yet")}</p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {participant.rosters.map((roster) => (
                <Link
                  key={roster.id}
                  href={`/rosters/${roster.id}`}
                  className="rounded-2xl border border-line bg-surface-alt p-4 transition hover:border-azure/40"
                >
                  <p className="text-base font-semibold text-ink">{roster.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("Credits left")}: {roster.creditsRemaining ?? "—"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSave}
          className="grid gap-5 rounded-3xl border border-line bg-surface p-6"
        >
          <h3 className="text-base font-semibold text-ink">{t("Edit participant")}</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("Name")}</span>
              <input
                value={form.displayName}
                onChange={(event) => setForm((f) => ({ ...f, displayName: event.target.value }))}
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
          </div>

          <label className="flex items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((f) => ({ ...f, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-line bg-surface-alt"
            />
            <span>{t("Active")}</span>
          </label>

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
              {t("Delete participant")}
            </button>
          </div>
        </form>
      </div>
    </ModuleShell>
  );
}
