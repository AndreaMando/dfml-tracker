"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ModuleShell } from "../../../components/module-shell";
import { StatIcon } from "../../../components/stat-icon";
import { useTranslation } from "../../../lib/i18n";

type Player = {
  id: string;
  fullName: string;
  position: "GK" | "DF" | "MF" | "FW";
  teamName: string | null;
  currentValue: string | null;
  initialValue: string | null;
  status: string | null;
  imageUrl: string | null;
  ownerRosterId: string | null;
  ownerRosterName: string | null;
  ownerParticipantName: string | null;
  stats: {
    appearances: number;
    avgVote: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    penaltiesScored: number;
    penaltiesMissed: number;
    penaltiesSaved: number;
    ownGoals: number;
    goalsConceded: number;
  };
};

const positionLabelKeys: Record<Player["position"], string> = {
  GK: "Goalkeeper",
  DF: "Defender",
  MF: "Midfielder",
  FW: "Forward",
};

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { t } = useTranslation();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/players/${id}`)
      .then((res) => res.json())
      .then((data: Player) => setPlayer(data))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm(t("Delete this player?"))) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    router.push("/players");
  }

  if (loading) {
    return (
      <ModuleShell title={t("Players")} description="" backHref="/players" backLabel={t("Back to players")}>
        <p className="text-sm text-ink-muted">{t("Loading")}...</p>
      </ModuleShell>
    );
  }

  if (!player) {
    return (
      <ModuleShell title={t("Players")} description="" backHref="/players" backLabel={t("Back to players")}>
        <p className="text-sm text-ink-muted">{t("Player not found")}</p>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      title={player.fullName}
      description={`${t(positionLabelKeys[player.position])} • ${player.teamName ?? "—"}`}
      backHref="/players"
      backLabel={t("Back to players")}
    >
      <div className="flex flex-wrap items-center gap-2">
        {player.status === "transferred" && (
          <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
            {t("Transferred")}
          </span>
        )}
        {player.ownerRosterName && (
          <Link
            href={`/rosters/${player.ownerRosterId}`}
            className="inline-flex items-center gap-1 rounded-full border border-azure/20 bg-azure-soft px-3 py-1 text-xs font-medium text-azure-deep transition hover:bg-azure/10"
          >
            {t("Owned by")} {player.ownerRosterName}
            {player.ownerParticipantName ? ` (${player.ownerParticipantName})` : ""}
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        <div className="flex-1 rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-ink-muted">{t("Market value")}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{player.currentValue ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-ink-muted">{t("Initial value")}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{player.initialValue ?? "—"}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <p className="text-sm text-ink-muted">{t("Career stats")}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <span className="text-xs text-ink-muted">{t("Appearances")}</span>
                <span className="text-lg font-semibold text-ink">{player.stats.appearances}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <span className="text-xs text-ink-muted">{t("Average vote")}</span>
                <span className="text-lg font-semibold text-ink">{player.stats.avgVote.toFixed(2)}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-goal-50.png" alt={t("Goals")} />
                <span className="text-lg font-semibold text-ink">{player.stats.goals}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-assist-64.png" alt={t("Assists")} />
                <span className="text-lg font-semibold text-ink">{player.stats.assists}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-yellow-card-64.png" alt={t("Yellow cards")} />
                <span className="text-lg font-semibold text-ink">{player.stats.yellowCards}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-red-card-64.png" alt={t("Red cards")} />
                <span className="text-lg font-semibold text-ink">{player.stats.redCards}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-penalty-64.png" alt={t("Penalties scored")} />
                <span className="text-lg font-semibold text-ink">{player.stats.penaltiesScored}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-penalty-missed-64.png" alt={t("Penalties missed")} />
                <span className="text-lg font-semibold text-ink">{player.stats.penaltiesMissed}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                <StatIcon src="/icons8-owngoal-64.png" alt={t("Own goals")} />
                <span className="text-lg font-semibold text-ink">{player.stats.ownGoals}</span>
              </div>
              {player.position === "GK" && (
                <>
                  <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                    <StatIcon src="/icons8-clean-sheet-80.png" alt={t("Clean sheets")} />
                    <span className="text-lg font-semibold text-ink">{player.stats.cleanSheets}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                    <StatIcon src="/icons8-penalty-saved-64.png" alt={t("Penalties saved")} />
                    <span className="text-lg font-semibold text-ink">{player.stats.penaltiesSaved}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface-alt py-3">
                    <StatIcon src="/icons8-goal-conceded-64.png" alt={t("Goals conceded")} />
                    <span className="text-lg font-semibold text-ink">{player.stats.goalsConceded}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.fullName}
            className="aspect-[255/378] w-52 self-center rounded-2xl object-cover sm:self-start"
          />
        ) : (
          <div className="flex aspect-[255/378] w-52 shrink-0 items-center justify-center self-center rounded-2xl border border-dashed border-line text-ink-muted sm:self-start">
            <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          {t("Delete player")}
        </button>
      </div>
    </ModuleShell>
  );
}
