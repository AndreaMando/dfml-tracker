"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { Tabs } from "../../../components/tabs";
import { getPlayerById, players as mockPlayers } from "../../../lib/mock-data";
import { useTranslation } from "../../../lib/i18n";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "history", label: "History" },
];

export default function PlayerDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const player = getPlayerById(id) || mockPlayers[0];
  const [activeTab, setActiveTab] = useState("overview");
  const { t } = useTranslation();

  return (
    <ModuleShell title={player.fullName} description={t("Player detail for {{player}}", { player: player.fullName })}>
      <PageHeader
        title={player.fullName}
        subtitle={`${player.position} • ${player.teamName}`}
        actionLabel={t("View roster")}
        actionHref="/rosters"
      />

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Market value")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{player.value}M</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Age")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{player.age}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Under 21")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{player.isUnder21 ? t("Yes") : t("No")}</p>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <h3 className="text-base font-semibold text-white">{t("Player summary")}</h3>
            <p className="mt-3 text-sm text-slate-400">{t("This player is currently projected to be a strong starter for upcoming matchdays.")}</p>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { label: t("Goals"), value: 9 },
              { label: t("Assists"), value: 6 },
              { label: t("Clean sheets"), value: 2 },
              { label: t("Form"), value: player.form },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <h3 className="text-base font-semibold text-white">{t("Recent performance")}</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl bg-slate-900/80 p-4">{t("Scored 1 goal in last match")}</div>
              <div className="rounded-2xl bg-slate-900/80 p-4">{t("Rated 8.2 vs Top Club")}</div>
              <div className="rounded-2xl bg-slate-900/80 p-4">{t("Transfer value increased")}</div>
            </div>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
