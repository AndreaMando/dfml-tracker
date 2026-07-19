"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { FilterPill } from "../../components/filter-pill";
import { Tabs } from "../../components/tabs";
import { useTranslation } from "../../lib/i18n";
import { players as mockPlayers } from "../../lib/mock-data";

const tabs = [
  { id: "all", label: "All" },
  { id: "top", label: "Top" },
];

const positions = ["all", "GK", "DF", "MF", "FW"];

export default function PlayersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");
  const [activePosition, setActivePosition] = useState("all");

  const filteredPlayers = useMemo(() => {
    return mockPlayers.filter((player) => {
      if (activePosition === "all") return true;
      return player.position === activePosition;
    });
  }, [activePosition]);

  return (
    <ModuleShell
      title={t("Players")}
      description={t("Browse player pool, positions and current valuations.")}
    >
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {positions.map((position) => (
            <FilterPill
              key={position}
              label={position === "all" ? t("All") : position}
              active={activePosition === position}
              onClick={() => setActivePosition(position)}
            />
          ))}
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "all" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{player.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-400">{player.teamName}</p>
                </div>
                <span className="rounded-full border border-cyan-700/40 bg-cyan-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {player.position}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-300">
                <span>{t("Value")}</span>
                <strong>{player.value}M</strong>
              </div>
              <p className="mt-3 text-sm text-slate-400">{player.form}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h3 className="text-base font-semibold text-white">{t("Top players")}</h3>
          <p className="mt-3 text-sm text-slate-400">{t("The most valuable players across the roster.")}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {filteredPlayers
              .sort((a, b) => b.value - a.value)
              .slice(0, 4)
              .map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 transition hover:border-cyan-500/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{player.position}</span>
                    <strong className="text-lg text-white">{player.value}M</strong>
                  </div>
                  <h4 className="mt-2 text-base font-semibold text-white">{player.fullName}</h4>
                </Link>
              ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
