"use client";

import { useTranslation } from "../lib/i18n";
import { cupRoundLabelKey } from "../lib/cup";

export type CupFixture = {
  id: string;
  matchdayNumber: number;
  rosterIdHome: string | null;
  rosterIdAway: string | null;
  homeName: string | null;
  awayName: string | null;
  goalsHome: number | null;
  goalsAway: number | null;
  status: string;
};

type Tie = {
  teamAId: string;
  teamAName: string | null;
  teamBId: string;
  teamBName: string | null;
  legs: CupFixture[]; // 2 legs (andata/ritorno) for quarti/semi, 1 for finale
};

function buildTies(legA: CupFixture[], legB: CupFixture[]): Tie[] {
  return legA
    .filter((f) => f.rosterIdHome && f.rosterIdAway)
    .map((a) => {
      const b = legB.find(
        (f) =>
          (f.rosterIdHome === a.rosterIdAway && f.rosterIdAway === a.rosterIdHome) ||
          (f.rosterIdHome === a.rosterIdHome && f.rosterIdAway === a.rosterIdAway)
      );
      return {
        teamAId: a.rosterIdHome!,
        teamAName: a.homeName,
        teamBId: a.rosterIdAway!,
        teamBName: a.awayName,
        legs: b ? [a, b] : [a],
      };
    });
}

function shareTeam(a: Tie, b: Tie): boolean {
  return a.teamAId === b.teamAId || a.teamAId === b.teamBId || a.teamBId === b.teamAId || a.teamBId === b.teamBId;
}

// Groups `lowerTies` (e.g. the 4 quarti ties) into `slotCount` pairs, each
// aligned under whichever `upperTies` entry (e.g. a semifinal) actually
// contains one of its two teams — reading who's already been paired by
// leghe.fantacalcio.it, never predicting it. Both arrive in whatever order
// the API happened to return (not guaranteed stable across syncs), so
// position alone can't be trusted; only shared team identity can. Slots with
// no upper-round data yet get a deterministic fallback pairing (sorted by
// team id) so the bracket doesn't visually reshuffle on every reload before
// results exist.
function pairLowerTies(
  lowerTies: Tie[],
  upperTies: Tie[],
  slotCount: number
): { upper: Tie | null; lower: (Tie | null)[] }[] {
  const sorted = [...lowerTies].sort((a, b) => a.teamAId.localeCompare(b.teamAId));
  const used = new Set<number>();
  const slots: { upper: Tie | null; lower: (Tie | null)[] }[] = [];

  for (const upper of upperTies) {
    const matchIndexes = sorted
      .map((lower, i) => (used.has(i) ? -1 : shareTeam(lower, upper) ? i : -1))
      .filter((i) => i !== -1);
    if (matchIndexes.length > 0) {
      matchIndexes.forEach((i) => used.add(i));
      slots.push({ upper, lower: matchIndexes.map((i) => sorted[i]) });
    }
  }

  // Whatever's left (no upper-round data yet) fills remaining slots in the
  // stable fallback order, two at a time.
  const leftover = sorted.filter((_, i) => !used.has(i));
  while (slots.length < slotCount) {
    slots.push({ upper: null, lower: leftover.splice(0, 2) });
  }
  return slots;
}

function goalsFor(tie: Tie, side: "A" | "B", legIndex: number): number | null {
  const leg = tie.legs[legIndex];
  if (!leg) return null;
  const teamId = side === "A" ? tie.teamAId : tie.teamBId;
  return teamId === leg.rosterIdHome ? leg.goalsHome : leg.goalsAway;
}

function TieBox({ tie, t }: { tie: Tie | null; t: (key: string) => string }) {
  if (!tie) {
    return (
      <div className="flex h-full min-h-[4.5rem] items-center justify-center rounded-2xl border border-dashed border-line bg-surface-alt p-3 text-center text-xs text-ink-muted">
        {t("Awaiting previous round")}
      </div>
    );
  }
  const legCount = tie.legs.length;
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-ink">{tie.teamAName ?? "—"}</span>
        <span className="flex shrink-0 gap-1.5 font-mono-data text-ink-muted">
          {Array.from({ length: legCount }, (_, i) => (
            <span key={i}>{goalsFor(tie, "A", i) ?? "–"}</span>
          ))}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-1">
        <span className="truncate font-medium text-ink">{tie.teamBName ?? "—"}</span>
        <span className="flex shrink-0 gap-1.5 font-mono-data text-ink-muted">
          {Array.from({ length: legCount }, (_, i) => (
            <span key={i}>{goalsFor(tie, "B", i) ?? "–"}</span>
          ))}
        </span>
      </div>
    </div>
  );
}

// Draws the connector lines between a round of `bottomCount` boxes and the
// `bottomCount / 2` boxes above them, using percentage coordinates so it
// always lines up with the boxes' own flex/grid layout above and below it.
function BracketConnector({ bottomCount }: { bottomCount: number }) {
  const pairs = bottomCount / 2;
  const bottomCenters = Array.from({ length: bottomCount }, (_, i) => (100 / bottomCount) * (i + 0.5));
  const topCenters = Array.from({ length: pairs }, (_, i) => (100 / pairs) * (i + 0.5));
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full text-line">
      {Array.from({ length: pairs }, (_, i) => {
        const b1 = bottomCenters[i * 2];
        const b2 = bottomCenters[i * 2 + 1];
        const top = topCenters[i];
        return (
          <g key={i} stroke="currentColor" strokeWidth="1" fill="none">
            <path d={`M ${b1} 30 L ${b1} 15 L ${b2} 15 L ${b2} 30`} />
            <path d={`M ${top} 0 L ${top} 15`} />
          </g>
        );
      })}
    </svg>
  );
}

export function CupBracket({
  fixtures,
  rosterManagerById,
}: {
  fixtures: CupFixture[];
  rosterManagerById: Map<string, string>;
}) {
  const { t } = useTranslation();

  const round1 = fixtures.filter((f) => f.matchdayNumber === 1);
  const round2 = fixtures.filter((f) => f.matchdayNumber === 2);
  const round3 = fixtures.filter((f) => f.matchdayNumber === 3);
  const round4 = fixtures.filter((f) => f.matchdayNumber === 4);
  const round5 = fixtures.filter((f) => f.matchdayNumber === 5);

  const quartiTies = buildTies(round1, round2);
  const semiTiesRaw = buildTies(round3, round4);
  const finalTies = buildTies(round5, []);

  const quartiPairing = pairLowerTies(quartiTies, semiTiesRaw, 2);
  const quartiSlots: (Tie | null)[] = quartiPairing.flatMap((slot) => [slot.lower[0] ?? null, slot.lower[1] ?? null]);
  const semiSlots: (Tie | null)[] = quartiPairing.map((slot) => slot.upper);
  const finalTie = finalTies[0] ?? null;

  const finalPlayed = finalTie && finalTie.legs[0]?.status === "played";
  let winnerName: string | null = null;
  let winnerRosterId: string | null = null;
  if (finalPlayed && finalTie) {
    const leg = finalTie.legs[0];
    const hasGoals = leg.goalsHome !== null && leg.goalsAway !== null;
    if (hasGoals && leg.goalsHome !== leg.goalsAway) {
      const teamAWon = leg.goalsHome! > leg.goalsAway!;
      winnerName = teamAWon ? finalTie.teamAName : finalTie.teamBName;
      winnerRosterId = teamAWon ? finalTie.teamAId : finalTie.teamBId;
    }
  }
  const winnerManager = winnerRosterId ? rosterManagerById.get(winnerRosterId) : null;

  if (quartiTies.length === 0) {
    return <p className="text-sm text-ink-muted">{t("Cup bracket not available yet.")}</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-2">
      {winnerName && (
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons8-trophy-100.png" alt="" className="h-16 w-16" />
          <p className="font-display text-xl font-bold text-ink">{winnerName}</p>
          {winnerManager && <p className="text-sm text-ink-muted">{winnerManager}</p>}
        </div>
      )}

      <div className="w-full max-w-xs">
        <TieBox tie={finalTie} t={t} />
        <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {t("Final")}
        </p>
      </div>

      <BracketConnector bottomCount={2} />

      <div className="grid w-full grid-cols-2 gap-4">
        {semiSlots.map((tie, i) => (
          <div key={i}>
            <TieBox tie={tie} t={t} />
          </div>
        ))}
      </div>
      <p className="w-full text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {t(cupRoundLabelKey(3)).replace(/ - .*/, "")}
      </p>

      <BracketConnector bottomCount={4} />

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        {quartiSlots.map((tie, i) => (
          <div key={i}>
            <TieBox tie={tie} t={t} />
          </div>
        ))}
      </div>
      <p className="w-full text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {t(cupRoundLabelKey(1)).replace(/ - .*/, "")}
      </p>
    </div>
  );
}
