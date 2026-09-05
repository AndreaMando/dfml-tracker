import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "../db";
import { matchdayFixtures, participants, rosters, seasons } from "../db/schema";
import { CUP_FINAL_ROUND } from "./cup";
import { computeStandings } from "./standings";

export type SeasonChampionRow = {
  seasonId: string;
  seasonName: string;
  leagueChampionUserId: string | null;
  cupChampionUserId: string | null;
};

async function userIdForRoster(rosterId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: participants.userId })
    .from(rosters)
    .innerJoin(participants, eq(participants.id, rosters.participantId))
    .where(eq(rosters.id, rosterId));
  return row?.userId ?? null;
}

async function championsForSeason(season: typeof seasons.$inferSelect): Promise<SeasonChampionRow> {
  const standings = await computeStandings(season.id);
  const top = standings[0];
  const leagueChampionUserId = top && top.played > 0 ? await userIdForRoster(top.rosterId) : null;

  const [finalFixture] = await db
    .select()
    .from(matchdayFixtures)
    .where(
      and(
        eq(matchdayFixtures.seasonId, season.id),
        eq(matchdayFixtures.competition, "cup"),
        eq(matchdayFixtures.matchdayNumber, CUP_FINAL_ROUND),
        eq(matchdayFixtures.status, "played")
      )
    );

  let cupChampionUserId: string | null = null;
  if (finalFixture?.rosterIdHome && finalFixture.rosterIdAway) {
    const hasGoals = finalFixture.goalsHome !== null && finalFixture.goalsAway !== null;
    const homeMetric = hasGoals ? finalFixture.goalsHome! : Number(finalFixture.scoreHome ?? 0);
    const awayMetric = hasGoals ? finalFixture.goalsAway! : Number(finalFixture.scoreAway ?? 0);
    if (homeMetric !== awayMetric) {
      const winnerRosterId = homeMetric > awayMetric ? finalFixture.rosterIdHome : finalFixture.rosterIdAway;
      cupChampionUserId = await userIdForRoster(winnerRosterId);
    }
  }

  return { seasonId: season.id, seasonName: season.name, leagueChampionUserId, cupChampionUserId };
}

/**
 * League/cup champions of every concluded season before `seasonId` — every
 * one of them, not just the one right before, so a badge history builds up
 * season after season (matched on the cross-season-stable `userId`, same
 * identity used by roster carryover). Nothing for the league's first
 * season, by design.
 */
export async function getPastSeasonsChampions(seasonId: string): Promise<SeasonChampionRow[]> {
  const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));
  if (!season) return [];

  const earlierSeasons = await db
    .select()
    .from(seasons)
    .where(lt(seasons.year, season.year))
    .orderBy(desc(seasons.year));
  // Only concluded seasons have a real champion — an in-progress or
  // never-started one (shouldn't normally happen for an earlier year) is
  // skipped rather than showing a misleading half-finished table's leader.
  const concludedSeasons = earlierSeasons.filter((s) => s.status === "finished" || s.status === "archived");

  const rows: SeasonChampionRow[] = [];
  for (const past of concludedSeasons) {
    rows.push(await championsForSeason(past));
  }
  return rows;
}
