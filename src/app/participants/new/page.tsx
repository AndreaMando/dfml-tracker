"use client";

import { useState } from "react";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

export default function ParticipantCreatePage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [credits, setCredits] = useState(80);

  return (
    <ModuleShell title={t("Create Participant")} description={t("Add a new league participant.")}>
      <PageHeader title={t("New participant")} subtitle={t("Create a participant and assign initial budget.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-white/10 bg-slate-950/70 p-6" onSubmit={(ev) => ev.preventDefault()}>
        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("Luca")}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Team")}</span>
          <input
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("The North Stars")}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Starting credits")}</span>
          <input
            type="number"
            value={credits}
            onChange={(event) => setCredits(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <button className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
          {t("Create participant")}
        </button>
      </form>
    </ModuleShell>
  );
}
