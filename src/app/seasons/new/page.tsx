"use client";

import { useState } from "react";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

export default function SeasonCreatePage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState("draft");

  return (
    <ModuleShell title={t("Create Season")} description={t("Add a new league season to the tracker.")}>
      <PageHeader title={t("New season")} subtitle={t("Create a season and configure the league timeline.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-white/10 bg-slate-950/70 p-6" onSubmit={(ev) => ev.preventDefault()}>
        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("DFML 26/27")}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Year")}</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-200">
          <span>{t("Status")}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="draft">{t("Draft")}</option>
            <option value="active">{t("Active")}</option>
            <option value="finished">{t("Finished")}</option>
          </select>
        </label>

        <button className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
          {t("Create season")}
        </button>
      </form>
    </ModuleShell>
  );
}
