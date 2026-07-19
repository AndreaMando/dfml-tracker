"use client";

import { useState } from "react";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

export default function RosterCreatePage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [participant, setParticipant] = useState("");
  const [formation, setFormation] = useState("4-3-3");
  const [credits, setCredits] = useState(100);

  return (
    <ModuleShell title={t("Create Roster")} description={t("Build a new roster for the season.")}>
      <PageHeader title={t("New roster")} subtitle={t("Create the roster and define starting budget.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-white/10 bg-slate-950/70 p-6" onSubmit={(ev) => ev.preventDefault()}>
        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Roster name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("North Stars")}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Participant")}</span>
          <input
            value={participant}
            onChange={(event) => setParticipant(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("Luca")}
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-200">
            <span>{t("Formation")}</span>
            <select
              value={formation}
              onChange={(event) => setFormation(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="4-3-3">4-3-3</option>
              <option value="4-4-2">4-4-2</option>
              <option value="3-5-2">3-5-2</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-200">
            <span>{t("Budget")}</span>
            <input
              type="number"
              value={credits}
              onChange={(event) => setCredits(Number(event.target.value))}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </label>
        </div>

        <button className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
          {t("Create roster")}
        </button>
      </form>
    </ModuleShell>
  );
}
