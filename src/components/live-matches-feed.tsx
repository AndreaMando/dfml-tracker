"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { useLiveMatches, type LiveMatch } from "../hooks/use-live-matches";

function TeamLogo({ name, logo }: { name: string; logo: string | null }) {
  if (!logo) {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[9px] font-bold text-ink-muted">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image src={logo} alt={name} width={24} height={24} unoptimized className="h-6 w-6 shrink-0 object-contain" />
  );
}

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Prominent row for the featured match on desktop/tablet — home/away each
// get their own min-w-0 flex column so a long name truncates instead of
// pushing the score/status off the edge. On mobile (<sm) the "next upcoming
// kickoff" case instead renders as a GridCard (see below), which has room
// for the full date/time without squeezing team names down to nothing —
// live/finished keep this row at every width.
function FeaturedRow({ match, t }: { match: LiveMatch; t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span className="min-w-0 truncate text-sm font-medium text-ink">{match.homeTeam.name}</span>
        <TeamLogo name={match.homeTeam.name} logo={match.homeTeam.logo} />
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 px-1">
        {match.status === "scheduled" ? (
          <span className="whitespace-nowrap text-xs font-semibold text-ink-muted">
            {formatKickoff(match.kickoffDateTime)}
          </span>
        ) : (
          <span className="font-mono-data text-lg font-bold text-ink">
            {match.score.home ?? "-"}:{match.score.away ?? "-"}
          </span>
        )}
        {match.status === "live" && (
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
            {match.minute !== null ? `${match.minute}'` : t("LIVE")}
          </span>
        )}
        {match.status === "finished" && (
          // Short universal abbreviation, not "Match finished" — that long a
          // label forces the shrink-0 center column wide enough to squeeze
          // both team names down to one letter on a narrow screen.
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t("FT")}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamLogo name={match.awayTeam.name} logo={match.awayTeam.logo} />
        <span className="min-w-0 truncate text-sm font-medium text-ink">{match.awayTeam.name}</span>
      </div>
    </div>
  );
}

// Compact card for the expanded grid — crest+name stacked home over away on
// the left, kickoff time or final score on the right. Same shape as the
// leghe.fantacalcio.it calendar card this was modeled on.
function GridCard({ match, t }: { match: LiveMatch; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo name={match.homeTeam.name} logo={match.homeTeam.logo} />
          <span className="min-w-0 truncate text-sm font-medium text-ink">{match.homeTeam.name}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo name={match.awayTeam.name} logo={match.awayTeam.logo} />
          <span className="min-w-0 truncate text-sm font-medium text-ink">{match.awayTeam.name}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        {match.status === "finished" ? (
          <span className="font-mono-data text-sm font-bold text-ink">
            {match.score.home ?? "-"}:{match.score.away ?? "-"}
          </span>
        ) : match.status === "live" ? (
          <span className="flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
            {match.minute !== null ? `${match.minute}'` : t("LIVE")}
          </span>
        ) : (
          <span className="whitespace-nowrap text-xs text-ink-muted">{formatKickoff(match.kickoffDateTime)}</span>
        )}
      </div>
    </div>
  );
}

export function LiveMatchesFeed({ matchday }: { matchday: number | null }) {
  const { t } = useTranslation();
  const { matches, isLoading, error } = useLiveMatches(matchday);
  const [expanded, setExpanded] = useState(false);

  const live = matches.filter((m) => m.status === "live");
  // Nothing live right now — feature the most recently finished match. If
  // nothing's been played yet either (whole matchday still ahead), feature
  // the next upcoming kickoff instead of leaving the section empty.
  const lastFinished =
    live.length === 0
      ? [...matches]
          .filter((m) => m.status === "finished")
          .sort((a, b) => new Date(b.kickoffDateTime).getTime() - new Date(a.kickoffDateTime).getTime())[0]
      : undefined;
  const upcoming =
    live.length === 0 && !lastFinished
      ? [...matches]
          .filter((m) => m.status === "scheduled")
          .sort((a, b) => new Date(a.kickoffDateTime).getTime() - new Date(b.kickoffDateTime).getTime())
      : [];
  const nextScheduled = upcoming[0];
  // sm+ shows the next two kickoffs; mobile keeps just the first and leaves
  // the second to the expandable grid.
  const secondScheduled = upcoming[1];
  const featured = live.length > 0 ? live : lastFinished ? [lastFinished] : nextScheduled ? [nextScheduled] : [];
  // Whatever's already shown in the featured row above shouldn't repeat in
  // the grid below.
  const featuredIds = new Set(featured.map((m) => m.id));
  const gridMatches = matches.filter((m) => !featuredIds.has(m.id));

  if (!matchday) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface-alt p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">{t("Serie A live")}</h3>
        <span className="rounded-full bg-azure-soft px-2.5 py-1 text-xs font-semibold text-azure-deep">
          {t("Matchday")} {matchday}
        </span>
      </div>

      {isLoading && matches.length === 0 && <p className="text-sm text-ink-muted">{t("Loading")}...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!isLoading && !error && matches.length === 0 && <p className="text-sm text-ink-muted">{t("No data yet")}</p>}

      {featured.length > 0 && (
        <div className="space-y-2">
          {featured.map((match) =>
            match.status === "scheduled" ? (
              // Next-upcoming-kickoff fallback: GridCard layout on mobile
              // (room for the full date without squeezing team names),
              // FeaturedRow on sm+ where the user prefers that look.
              <div key={match.id}>
                <div className="sm:hidden">
                  <GridCard match={match} t={t} />
                </div>
                <div className="hidden sm:block">
                  <FeaturedRow match={match} t={t} />
                </div>
              </div>
            ) : (
              <FeaturedRow key={match.id} match={match} t={t} />
            )
          )}
          {secondScheduled && (
            <div className="hidden sm:block">
              <FeaturedRow match={secondScheduled} t={t} />
            </div>
          )}
        </div>
      )}

      {gridMatches.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-azure transition hover:text-azure-deep ${featured.length > 0 ? "mt-3" : ""}`}
          >
            {expanded ? t("Hide all matches") : t("Show all matches")}
            <ChevronDown size={14} className={`transition ${expanded ? "rotate-180" : ""}`} />
          </button>

          {expanded && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {gridMatches.map((match) =>
                match.id === secondScheduled?.id ? (
                  // Already featured on sm+, so only mobile lists it here.
                  <div key={match.id} className="sm:hidden">
                    <GridCard match={match} t={t} />
                  </div>
                ) : (
                  <GridCard key={match.id} match={match} t={t} />
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
