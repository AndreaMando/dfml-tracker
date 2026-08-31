"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

type Season = { id: string; name: string; status: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ParticipantCreatePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!seasonId) return;
    setSaving(true);
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        userId: slugify(name) || slugify(team),
        displayName: name,
        teamName: team,
      }),
    });
    const created = await res.json();
    setSaving(false);
    router.push(`/participants/${created.id}`);
  }

  return (
    <ModuleShell
      title={t("Create Participant")}
      description={t("Add a new league participant.")}
      backHref="/participants"
      backLabel={t("Back to participants")}
    >
      <PageHeader title={t("New participant")} subtitle={t("Create a participant and assign initial budget.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-line bg-surface p-6" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Season")}</span>
          <select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Name")}</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
            placeholder={t("Luca")}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Team")}</span>
          <input
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
            placeholder={t("The North Stars")}
          />
        </label>

        <button
          type="submit"
          disabled={saving || !seasonId}
          className="w-full rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
        >
          {saving ? t("Saving") + "..." : t("Create participant")}
        </button>
      </form>
    </ModuleShell>
  );
}
