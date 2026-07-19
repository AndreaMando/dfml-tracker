"use client";

import { ModuleShell } from "../../components/module-shell";
import { useTranslation } from "../../lib/i18n";

const sessions = [
  { label: "Initial Auction", status: "Open", deadline: "Today 20:00" },
  { label: "Repair 1", status: "Locked", deadline: "Tomorrow 18:00" },
  { label: "Free Trade", status: "Open", deadline: "Friday 22:00" },
];

export default function MarketPage() {
  const { t } = useTranslation();

  return (
    <ModuleShell
      title={t("Market")}
      description={t("Track transfer sessions, movement windows and market activity.")}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {sessions.map((session) => (
          <article
            key={session.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{t(session.label)}</h2>
                <p className="mt-1 text-sm text-slate-400">{session.deadline}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${session.status === "Open" ? "border-emerald-700/40 bg-emerald-950/60 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"}`}>
                {t(session.status)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </ModuleShell>
  );
}
