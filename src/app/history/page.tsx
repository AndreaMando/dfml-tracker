"use client";

import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";

const history = [
  { title: "Transfer window closed", detail: "North Stars finalized three market moves." },
  { title: "Lineup submitted", detail: "Blue Thunder locked the 4-4-2 formation." },
  { title: "Season reset", detail: "Player valuations refreshed after the last matchday." },
];

export default function HistoryPage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("History")}
      description={t("Review the recent chronology of league actions.")}
    >
      <div className="space-y-3">
        {history.map((item, index) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-700/40 bg-cyan-950/60 text-sm font-semibold text-cyan-300">
                {index + 1}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </ModuleShell>
  );
}
