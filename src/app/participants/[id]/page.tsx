"use client";

import { useParams } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { Tabs } from "../../../components/tabs";
import { getParticipantById, participants as mockParticipants } from "../../../lib/mock-data";
import { useTranslation } from "../../../lib/i18n";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "transactions", label: "Transactions" },
];

export default function ParticipantDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const participant = getParticipantById(id) || mockParticipants[0];
  const { t } = useTranslation();

  return (
    <ModuleShell title={participant.team} description={t("Details for {{team}}", { team: participant.team })}>
      <PageHeader
        title={participant.team}
        subtitle={`${participant.name} • ${participant.status}`}
        actionLabel={t("View roster")}
        actionHref="/rosters"
      />

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Owner")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{participant.name}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Credits")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{participant.credits}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{t("Status")}</p>
            <p className="mt-2 text-xl font-semibold text-white">{participant.status}</p>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab="overview" onChange={() => {}} />

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <p className="text-sm text-slate-400">{t("Participant overview and recent history will appear here.")}</p>
        </div>
      </div>
    </ModuleShell>
  );
}
