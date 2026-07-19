"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { FilterPill } from "../../components/filter-pill";
import { Tabs } from "../../components/tabs";
import { useTranslation } from "../../lib/i18n";
import { rosters as mockRosters } from "../../lib/mock-data";

const tabs = [
  { id: "grid", label: "Grid" },
  { id: "table", label: "Table" },
];

const filterOptions = ["all", "active", "inactive"];

export default function RostersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("grid");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredRosters = useMemo(() => {
    return mockRosters.filter((item) => {
      if (activeFilter === "active") return item.active;
      if (activeFilter === "inactive") return !item.active;
      return true;
    });
  }, [activeFilter]);

  return (
    <ModuleShell
      title={t("Rosters")}
      description={t("Review squads, player count and remaining budget for every roster.")}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <FilterPill
              key={option}
              label={t(option === "all" ? "All" : option === "active" ? "Active" : "Inactive")}
              active={activeFilter === option}
              onClick={() => setActiveFilter(option)}
            />
          ))}
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "grid" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredRosters.map((roster) => (
            <Link
              key={roster.id}
              href={`/rosters/${roster.id}`}
              className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{roster.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{roster.participant}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${roster.active ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800 text-slate-300"}`}>
                  {roster.active ? t("Active") : t("Inactive")}
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3">
                  <span>{t("Players")}</span>
                  <strong>{roster.players}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3">
                  <span>{t("Credits")}</span>
                  <strong>{roster.credits} </strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("Roster")}</th>
                <th className="px-4 py-3">{t("Manager")}</th>
                <th className="px-4 py-3">{t("Players")}</th>
                <th className="px-4 py-3">{t("Credits")}</th>
                <th className="px-4 py-3">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRosters.map((roster) => (
                <tr key={roster.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white">{roster.name}</td>
                  <td className="px-4 py-3">{roster.participant}</td>
                  <td className="px-4 py-3">{roster.players}</td>
                  <td className="px-4 py-3">{roster.credits}</td>
                  <td className="px-4 py-3">{roster.active ? t("Active") : t("Inactive")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModuleShell>
  );
}
