"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ModuleShell } from "../../components/module-shell";
import { FilterPill } from "../../components/filter-pill";
import { useTranslation } from "../../lib/i18n";

type Participant = {
  id: string;
  displayName: string;
  teamName: string | null;
  isActive: boolean | null;
};

const statusFilters = ["all", "active", "inactive"];

export default function ParticipantsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/participants")
      .then((res) => res.json())
      .then(setParticipants)
      .finally(() => setLoading(false));
  }, []);

  const filteredParticipants = useMemo(() => {
    return participants.filter((item) => {
      if (filter === "active") return !!item.isActive;
      if (filter === "inactive") return !item.isActive;
      return true;
    });
  }, [participants, filter]);

  return (
    <ModuleShell
      title={t("Participants")}
      description={t("Manage the league roster of teams and their current state.")}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <FilterPill
              key={status}
              label={t(status === "all" ? "All" : status === "active" ? "Active" : "Inactive")}
              active={filter === status}
              onClick={() => setFilter(status)}
            />
          ))}
        </div>
        <Link
          href="/participants/new"
          className="rounded-2xl border border-azure/20 bg-azure-soft px-4 py-2 text-sm font-semibold text-azure-deep transition hover:bg-azure/10"
        >
          {t("Create participant")}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredParticipants.map((participant) => (
            <Link
              key={participant.id}
              href={`/participants/${participant.id}`}
              className="rounded-3xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-azure/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{participant.displayName}</h2>
                  <p className="mt-1 text-sm text-ink-muted">{participant.teamName ?? "—"}</p>
                </div>
                <span className="rounded-full border border-azure/20 bg-azure-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-azure-deep">
                  {participant.isActive ? t("Active") : t("Inactive")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
