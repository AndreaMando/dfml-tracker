"use client";

import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";

const scores = [
  { roster: "North Stars", points: 28, matchday: 6 },
  { roster: "Blue Thunder", points: 21, matchday: 6 },
  { roster: "Rookies FC", points: 18, matchday: 6 },
];

export default function ScoresPage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("Scores & Votes")}
      description={t("Review matchday points and vote-based scoring summaries.")}
    >
      <div className="space-y-3">
        {scores.map((entry) => (
          <article
            key={entry.roster}
            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold text-white">{entry.roster}</h2>
              <p className="mt-1 text-sm text-slate-400">Matchday {entry.matchday}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <span className="mr-2">{t("Total points")}</span>
              <strong className="text-white">{entry.points}</strong>
            </div>
          </article>
        ))}
      </div>
    </ModuleShell>
  );
}
