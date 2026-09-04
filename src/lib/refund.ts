// Sale-refund rule for a roster player, shared by the server route
// (src/app/api/rosters/[id]/players/[playerId]/route.ts) and its client-side
// preview (src/app/rosters/[id]/page.tsx), so the popup shown before selling
// always matches what actually gets credited.
export type RefundInput = {
  paid: number;
  currentValue: number | null;
  // players.initialValue (Q.In.) at the moment THIS roster bought the
  // player — null for rows not yet backfilled, or for players added before
  // this field existed.
  acquisitionInitialValue: number | null;
  // The fantacalcio.it asterisk (long-term injury, transfer limbo, etc.) —
  // always refunds the full purchase price, no cap. Takes priority over
  // every other rule.
  priceUncertain: boolean;
};

export function computeSaleRefund({ paid, currentValue, acquisitionInitialValue, priceUncertain }: RefundInput): number {
  if (priceUncertain) return paid;

  // Paid at or below the Q.In. of the year of purchase: the fantallenatore
  // also gets the plusvalenza (currentValue above that Q.In.), but never a
  // minusvalenza — a bad quotation drop never costs more than what was paid.
  if (acquisitionInitialValue !== null && paid <= acquisitionInitialValue) {
    const plusvalenza = currentValue !== null ? Math.max(0, currentValue - acquisitionInitialValue) : 0;
    return paid + plusvalenza;
  }

  // Paid above the Q.In. (or acquisitionInitialValue unknown — same
  // behavior as before this rule existed): capped at the current quotation;
  // no quotation on record at all -> full refund.
  return currentValue !== null ? Math.min(paid, currentValue) : paid;
}
