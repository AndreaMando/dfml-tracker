"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

export default function PlayerCreatePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [position, setPosition] = useState("MF");
  const [currentValue, setCurrentValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, teamName, position, currentValue }),
    });
    const created = await res.json();
    setSaving(false);
    router.push(`/players/${created.id}`);
  }

  return (
    <ModuleShell
      title={t("Add player")}
      description={t("Add a player not present in the imported list.")}
      backHref="/players"
      backLabel={t("Back to players")}
    >
      <PageHeader title={t("New player")} subtitle={t("Add a player not present in the imported list.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-line bg-surface p-6" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Name")}</span>
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
            placeholder={t("Marco Rossi")}
          />
        </label>

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Team")}</span>
          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
            placeholder={t("Atalanta")}
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("Position")}</span>
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value)}
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
              value={currentValue}
              onChange={(event) => setCurrentValue(event.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
        >
          {saving ? t("Saving") + "..." : t("Add player")}
        </button>
      </form>
    </ModuleShell>
  );
}
