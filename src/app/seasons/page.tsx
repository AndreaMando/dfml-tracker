"use client";

import Link from "next/link";
import { ModuleShell } from "../../components/module-shell";
import { SectionCard } from "../../components/section-card";
import { useTranslation } from "../../lib/i18n";
import { seasons as mockSeasons } from "../../lib/mock-data";

export default function SeasonsPage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("Seasons")}
      description={t("Track season status, participants and the current matchday cadence.")}
    >
      <SectionCard title={t("Season summary")} description={t("Overview of the current season")}> 
        <div className="grid gap-4 lg:grid-cols-2">
          {mockSeasons.map((season) => (
            <article key={season.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{season.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{season.year}</p>
                </div>
                <span className="rounded-full border border-cyan-700/40 bg-cyan-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {season.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                <span>{t("Planned matchdays")}</span>
                <strong className="text-white">{season.startDate.slice(0, 4)} → {season.endDate.slice(0, 4)}</strong>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t("Create Season")} description={t("Create a new league season and configure the schedule.")}>
        <Link href="/seasons/new" className="inline-flex rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20">
          {t("Create season")}
        </Link>
      </SectionCard>
    </ModuleShell>
  );
}
