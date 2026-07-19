"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { FilterPill } from "../../components/filter-pill";
import { useTranslation } from "../../lib/i18n";
import { participants as mockParticipants } from "../../lib/mock-data";

const statusFilters = ["all", "active", "pending"];

export default function ParticipantsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");

  const filteredParticipants = useMemo(() => {
    return mockParticipants.filter((item) => {
      if (filter === "all") return true;
      return item.status.toLowerCase() === filter;
    });
  }, [filter]);

  return (
    <ModuleShell
      title={t("Participants")}
      description={t("Manage the league roster of teams and their current state.")}
    >
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <FilterPill
              key={status}
              label={t(status === "all" ? "All" : status === "active" ? "Active" : "Pending")}
              active={filter === status}
              onClick={() => setFilter(status)}
            />
          ))}
        </div>
        <Link
          href="/participants/new"
          className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
        >
          {t("Create participant")}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {filteredParticipants.map((participant) => (
          <Link
            key={participant.id}
            href={`/participants/${participant.id}`}
            className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{participant.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{participant.team}</p>
              </div>
              <span className="rounded-full border border-cyan-700/40 bg-cyan-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{participant.status}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
              <span>{t("Remaining credits")}</span>
              <p className="mt-2 text-xl font-semibold text-white">{participant.credits}</p>
            </div>
          </Link>
        ))}
      </div>
    </ModuleShell>
  );
}
