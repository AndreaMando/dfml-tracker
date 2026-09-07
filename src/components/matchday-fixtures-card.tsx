"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "../lib/i18n";

type Fixture = {
  id: string;
  homeName: string | null;
  awayName: string | null;
  goalsHome: number | null;
  goalsAway: number | null;
  status: string;
};

/** Read-only mock of this matchday's fantasquadra matchups — click through to Results for the real thing. */
export function MatchdayFixturesCard({ matchday, fixtures }: { matchday: number | null; fixtures: Fixture[] }) {
  const { t } = useTranslation();
  if (!matchday || fixtures.length === 0) return null;

  return (
    <Link
      href="/scores"
      className="group block rounded-2xl border border-line bg-surface-alt p-4 transition hover:border-azure/40"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">{t("Matchday fixtures")}</h3>
        <span className="flex items-center gap-1 text-xs font-semibold text-azure-deep">
          {t("Matchday")} {matchday}
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fixtures.map((f) => (
          <div
            key={f.id}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate text-right font-medium text-ink">{f.homeName ?? "—"}</span>
            <span className="shrink-0 font-mono-data text-xs text-ink-muted">
              {f.status === "played" ? `${f.goalsHome ?? "-"}:${f.goalsAway ?? "-"}` : t("vs")}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{f.awayName ?? "—"}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
