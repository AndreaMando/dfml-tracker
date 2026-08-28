export type FantavotoStats = {
  vote?: number | string | null;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  cleanSheet?: boolean | null;
  penaltiesSaved?: number | null;
  penaltiesMissed?: number | null;
  ownGoals?: number | null;
};

/**
 * Classic Fantacalcio scoring:
 * score = voto base + gol*3 + assist*1 - ammonizioni*0.5 - espulsioni*1
 *   + (GK && clean sheet ? 1 : 0) + (GK ? rigori parati*3 : 0)
 *   - rigori sbagliati*1 - autogol*3
 * No malus for goals conceded.
 */
export function computeFantavoto(position: string, stats: FantavotoStats): number {
  const vote = Number(stats.vote ?? 0);
  const goals = Number(stats.goals ?? 0);
  const assists = Number(stats.assists ?? 0);
  const yellowCards = Number(stats.yellowCards ?? 0);
  const redCards = Number(stats.redCards ?? 0);
  const penaltiesSaved = Number(stats.penaltiesSaved ?? 0);
  const penaltiesMissed = Number(stats.penaltiesMissed ?? 0);
  const ownGoals = Number(stats.ownGoals ?? 0);
  const isGoalkeeper = position === "GK";

  let score = vote + goals * 3 + assists * 1 - yellowCards * 0.5 - redCards * 1;
  if (isGoalkeeper) {
    if (stats.cleanSheet) score += 1;
    score += penaltiesSaved * 3;
  }
  score -= penaltiesMissed * 1;
  score -= ownGoals * 3;

  return Math.round(score * 100) / 100;
}
