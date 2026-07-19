"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { Tabs } from "../../../components/tabs";
import { FilterPill } from "../../../components/filter-pill";
import { getRosterById, players as mockPlayers, rosters } from "../../../lib/mock-data";
import { useTranslation } from "../../../lib/i18n";

const rosterPlayers = [
  { id: "player-1", name: "Marco Rossi", position: "FW", value: 22 },
  { id: "player-2", name: "Lorenzo Bianchi", position: "MF", value: 18 },
  { id: "player-3", name: "Davide Ferri", position: "DF", value: 16 },
];

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "players", label: "Players" },
  { id: "activity", label: "Activity" },
];

export default function RosterDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const roster = getRosterById(id) || rosters[0];
  const [activeTab, setActiveTab] = useState("overview");
  const [formation, setFormation] = useState(roster.formation);
  const { t } = useTranslation();

  return (
    <ModuleShell title={roster.name} description={`${t("Detail view for")} ${roster.name}`}>
      <PageHeader
        title={roster.name}
        subtitle={`${t("Managed by")} ${roster.participant}`}
        actionLabel={t("Edit roster")}
        actionHref="#edit"
      />

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Formation")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{formation}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Players")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{roster.players}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Credits left")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{roster.credits}</p>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <h3 className="text-base font-semibold text-white">{t("Summary")}</h3>
              <p className="mt-3 text-sm text-slate-400">{t("Review roster composition, budget and lineup readiness.")}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <h3 className="text-base font-semibold text-white">{t("Filters")}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <FilterPill label={t("All")} active />
                <FilterPill label={t("Forwards")} />
                <FilterPill label={t("Midfielders")} />
                <FilterPill label={t("Defenders")} />
                <FilterPill label={t("Goalkeepers")} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {rosterPlayers.map((player) => (
              <article key={player.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{player.name}</h4>
                    <p className="text-sm text-slate-400">{player.position}</p>
                  </div>
                  <p className="text-sm font-semibold text-cyan-300">{player.value}M</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <h3 className="text-base font-semibold text-white">{t("Recent activity")}</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl bg-slate-900/80 p-4">{t("Player transfer completed")}</div>
              <div className="rounded-2xl bg-slate-900/80 p-4">{t("Lineup updated for Matchday 7")}</div>
              <div className="rounded-2xl bg-slate-900/80 p-4">{t("Budget review scheduled")}</div>
            </div>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
