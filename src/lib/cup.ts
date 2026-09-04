// Fixed bracket stage names for the cup's own round numbering (matchdayNumber
// on a competition: "cup" fixture/lineup) — quarti, semifinali, finale, exactly
// as leghe.fantacalcio.it labels its own cup calendar. Bracket progression
// (who advances) isn't computed by this app — these are just display labels
// for whatever rounds the leghe API has already resolved and we've synced.
// Values are i18n keys (see src/lib/i18n.tsx), not final display text.
export const CUP_ROUND_LABEL_KEYS: Record<number, string> = {
  1: "Quarterfinals - First leg",
  2: "Quarterfinals - Second leg",
  3: "Semifinals - First leg",
  4: "Semifinals - Second leg",
  5: "Final",
};

export const CUP_FINAL_ROUND = 5;

export function cupRoundLabelKey(matchdayNumber: number): string {
  return CUP_ROUND_LABEL_KEYS[matchdayNumber] ?? `Cup round ${matchdayNumber}`;
}
