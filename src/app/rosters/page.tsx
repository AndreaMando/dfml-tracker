"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { FilterPill } from "../../components/filter-pill";
import { Tabs } from "../../components/tabs";
import { useTranslation } from "../../lib/i18n";

type Roster = {
  id: string;
  name: string | null;
  creditsRemaining: string | null;
  participantName: string | null;
  isActive: boolean | null;
  playerCount: number;
};

const filterOptions = ["all", "active", "inactive"];

export default function RostersPage() {
  const { t } = useTranslation();
  const tabs = [
    { id: "grid", label: t("Grid") },
    { id: "table", label: t("Table") },
  ];
  const [activeTab, setActiveTab] = useState("grid");
  const [activeFilter, setActiveFilter] = useState("all");
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rosters")
      .then((res) => res.json())
      .then(setRosters)
      .finally(() => setLoading(false));
  }, []);

  const filteredRosters = useMemo(() => {
    return rosters.filter((item) => {
      if (activeFilter === "active") return !!item.isActive;
      if (activeFilter === "inactive") return !item.isActive;
      return true;
    });
  }, [rosters, activeFilter]);

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
        <div className="flex items-center gap-3">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <Link
            href="/rosters/new"
            className="rounded-2xl border border-azure/20 bg-azure-soft px-4 py-2 text-sm font-semibold text-azure-deep transition hover:bg-azure/10"
          >
            {t("Create roster")}
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      ) : activeTab === "grid" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredRosters.map((roster) => (
            <Link
              key={roster.id}
              href={`/rosters/${roster.id}`}
              className="rounded-3xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-azure/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{roster.name}</h2>
                  <p className="mt-1 text-sm text-ink-muted">{roster.participantName ?? "—"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${roster.isActive ? "bg-emerald-50 text-emerald-700" : "bg-surface-alt text-ink"}`}>
                  {roster.isActive ? t("Active") : t("Inactive")}
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm text-ink">
                <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-alt px-3 py-3">
                  <span>{t("Players")}</span>
                  <strong>{roster.playerCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-alt px-3 py-3">
                  <span>{t("Credits")}</span>
                  <strong>{roster.creditsRemaining ?? "—"}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <table className="min-w-full text-left text-sm text-ink">
            <thead className="bg-surface-alt text-ink-muted">
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
                <tr key={roster.id} className="border-t border-line">
                  <td className="px-4 py-3 text-ink">
                    <Link href={`/rosters/${roster.id}`} className="hover:text-azure-deep">
                      {roster.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{roster.participantName ?? "—"}</td>
                  <td className="px-4 py-3">{roster.playerCount}</td>
                  <td className="px-4 py-3">{roster.creditsRemaining ?? "—"}</td>
                  <td className="px-4 py-3">{roster.isActive ? t("Active") : t("Inactive")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModuleShell>
  );
}
