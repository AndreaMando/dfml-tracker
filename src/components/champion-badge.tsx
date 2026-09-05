"use client";

import { useEffect, useState } from "react";

export type SeasonChampionRow = {
  seasonId: string;
  seasonName: string;
  leagueChampionUserId: string | null;
  cupChampionUserId: string | null;
};

export type ChampionsInfo = { seasons: SeasonChampionRow[] };

export type ChampionBadgeEntry = { type: "league" | "cup"; seasonName: string };

/** Fetches every past concluded season's league/cup champions, relative to `seasonId` — null until loaded or no seasonId given. */
export function useChampions(seasonId: string | null | undefined): ChampionsInfo | null {
  const [data, setData] = useState<ChampionsInfo | null>(null);

  useEffect(() => {
    if (!seasonId) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/seasons/champions?seasonId=${seasonId}`)
      .then((res) => res.json())
      .then((body: ChampionsInfo) => {
        if (!cancelled) setData(body);
      });
    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  return data;
}

/** Every league/cup win, across every past season, earned by `userId` — most recent season first. */
export function getChampionBadges(
  champions: ChampionsInfo | null,
  userId: string | null | undefined
): ChampionBadgeEntry[] {
  if (!champions || !userId) return [];
  const entries: ChampionBadgeEntry[] = [];
  for (const season of champions.seasons) {
    if (season.leagueChampionUserId === userId) entries.push({ type: "league", seasonName: season.seasonName });
    if (season.cupChampionUserId === userId) entries.push({ type: "cup", seasonName: season.seasonName });
  }
  return entries;
}

const BADGE_ICON: Record<"league" | "cup", string> = {
  league: "/icons8-star-badge-48.png",
  cup: "/icons8-trophy-badge-64.png",
};

/** Compact icon for inline use next to a team/participant name. */
export function ChampionIcon({
  type,
  label,
  className = "h-4 w-4",
}: {
  type: "league" | "cup";
  label: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={BADGE_ICON[type]} alt={label} title={label} className={`inline-block shrink-0 align-text-bottom ${className}`} />
  );
}

/** Full "<icon> Vincitore stagione/coppa <nome stagione>" caption, italic. */
export function ChampionCaption({
  entry,
  t,
  large = false,
}: {
  entry: ChampionBadgeEntry;
  t: (key: string) => string;
  large?: boolean;
}) {
  const label = `${t(entry.type === "league" ? "League winner" : "Cup winner")} ${entry.seasonName}`;
  return (
    <p className={`flex items-center gap-2 italic text-ink ${large ? "text-base" : "text-xs"}`}>
      <ChampionIcon type={entry.type} label={label} className={large ? "h-7 w-7" : "h-4 w-4"} />
      <span>{label}</span>
    </p>
  );
}
