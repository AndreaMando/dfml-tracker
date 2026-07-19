"use client";

import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";

const standings = [
  { rank: 1, roster: "North Stars", points: 34, played: 6 },
  { rank: 2, roster: "Blue Thunder", points: 29, played: 6 },
  { rank: 3, roster: "Rookies FC", points: 24, played: 6 },
];

export default function StandingsPage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("Standings")}
      description={t("Monitor the live table and current league positions.")}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/20">
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-slate-200">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Roster</th>
              <th className="px-4 py-3">Played</th>
              <th className="px-4 py-3">Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => (
              <tr key={entry.rank} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-white">{entry.rank}</td>
                <td className="px-4 py-3">{entry.roster}</td>
                <td className="px-4 py-3">{entry.played}</td>
                <td className="px-4 py-3">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}
