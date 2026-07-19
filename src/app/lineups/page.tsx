"use client";

import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";

const lineups = [
  { roster: "North Stars", formation: "4-3-3", status: "Submitted", matchday: 6 },
  { roster: "Blue Thunder", formation: "4-4-2", status: "Pending", matchday: 6 },
  { roster: "Rookies FC", formation: "3-5-2", status: "Submitted", matchday: 6 },
];

export default function LineupsPage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("Lineups")}
      description={t("Inspect submitted formations and pending matchday selections.")}
    >
      <div className="space-y-3">
        {lineups.map((lineup) => (
          <article
            key={`${lineup.roster}-${lineup.matchday}`}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold text-white">{lineup.roster}</h2>
              <p className="mt-1 text-sm text-slate-400">{t("Matchday")} {lineup.matchday}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                {t("Formation")} <span className="ml-2 font-semibold text-white">{lineup.formation}</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${lineup.status === "Submitted" ? "border-emerald-700/40 bg-emerald-950/60 text-emerald-300" : "border-amber-700/40 bg-amber-950/60 text-amber-300"}`}>
                {t(lineup.status)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </ModuleShell>
  );
}
