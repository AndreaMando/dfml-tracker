"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { PageHeader } from "../../../components/page-header";
import { useTranslation } from "../../../lib/i18n";

type Season = { id: string; name: string; status: string };
type Participant = { id: string; seasonId: string; displayName: string; teamName: string | null };

export default function RosterCreatePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [credits, setCredits] = useState(500);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/seasons").then((res) => res.json()),
      fetch("/api/participants").then((res) => res.json()),
    ]).then(([seasonsData, participantsData]: [Season[], Participant[]]) => {
      setSeasons(seasonsData);
      setParticipants(participantsData);
      const active = seasonsData.find((s) => s.status === "active") ?? seasonsData[0];
      if (active) setSeasonId(active.id);
    });
  }, []);

  const availableParticipants = useMemo(
    () => participants.filter((p) => p.seasonId === seasonId),
    [participants, seasonId]
  );

  const selectedParticipant = availableParticipants.find((p) => p.id === participantId);

  useEffect(() => {
    if (availableParticipants[0]) {
      setParticipantId(availableParticipants[0].id);
    }
  }, [availableParticipants]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!seasonId || !participantId) return;
    setSaving(true);
    const res = await fetch("/api/rosters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        participantId,
        creditsRemaining: credits,
      }),
    });
    const created = await res.json();
    setSaving(false);
    router.push(`/rosters/${created.id}`);
  }

  return (
    <ModuleShell
      title={t("Create Roster")}
      description={t("Build a new roster for the season.")}
      backHref="/rosters"
      backLabel={t("Back to rosters")}
    >
      <PageHeader title={t("New roster")} subtitle={t("Create the roster and define starting budget.")} />
      <form className="mt-6 grid gap-5 rounded-3xl border border-line bg-surface p-6" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Season")}</span>
          <select
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Participant")}</span>
          <select
            value={participantId}
            onChange={(event) => setParticipantId(event.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          >
            {availableParticipants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.displayName}
              </option>
            ))}
          </select>
        </label>

        {selectedParticipant && (
          <p className="rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink-muted">
            {t("Team name")}:{" "}
            <strong className="text-ink">
              {selectedParticipant.teamName || selectedParticipant.displayName}
            </strong>{" "}
            <span className="text-xs">({t("set on the Participants page")})</span>
          </p>
        )}

        <label className="block space-y-2 text-sm text-ink">
          <span>{t("Budget")}</span>
          <input
            type="number"
            value={credits}
            onChange={(event) => setCredits(Number(event.target.value))}
            className="w-full rounded-2xl border border-line bg-surface-alt px-4 py-3 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/20"
          />
        </label>

        <button
          type="submit"
          disabled={saving || !seasonId || !participantId}
          className="w-full rounded-2xl bg-azure px-4 py-3 text-sm font-semibold text-white transition hover:bg-azure-deep disabled:opacity-60"
        >
          {saving ? t("Saving") + "..." : t("Create roster")}
        </button>
      </form>
    </ModuleShell>
  );
}
