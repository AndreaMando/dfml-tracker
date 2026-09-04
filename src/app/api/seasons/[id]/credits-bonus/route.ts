import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db";
import { creditsBonusRules, participants, rosters } from "../../../../../db/schema";
import { creditsBonusForRank, getCreditsBonusMap } from "../../../../../lib/standings";
import { setCreditsBonusRulesSchema } from "../../../../../lib/schemas";
import { parseJsonBody } from "../../../../../lib/validate";

// GET returns rank -> bonus for this season, one row per participant slot,
// pre-filled with the historical default tiers (50/75/100) for any rank the
// season hasn't customized yet — so the Finance page always has something
// sensible to show and edit.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: seasonId } = await params;

  const seasonRosters = await db
    .select({ id: rosters.id })
    .from(rosters)
    .innerJoin(participants, eq(participants.id, rosters.participantId))
    .where(eq(rosters.seasonId, seasonId));
  const participantCount = seasonRosters.length;

  const customBonusByRank = await getCreditsBonusMap(seasonId);
  const rules = Array.from({ length: participantCount }, (_, i) => {
    const rank = i + 1;
    return { rank, bonus: creditsBonusForRank(rank, customBonusByRank) };
  });

  return NextResponse.json({ rules });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: seasonId } = await params;
  const parsed = await parseJsonBody(request, setCreditsBonusRulesSchema);
  if ("response" in parsed) return parsed.response;
  const { rules } = parsed.data;

  for (const rule of rules) {
    await db
      .insert(creditsBonusRules)
      .values({ seasonId, rank: rule.rank, bonus: rule.bonus })
      .onConflictDoUpdate({
        target: [creditsBonusRules.seasonId, creditsBonusRules.rank],
        set: { bonus: rule.bonus },
      });
  }

  return NextResponse.json({ ok: true });
}
