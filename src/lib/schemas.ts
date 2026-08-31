// Request-body validation schemas, one group per API resource. Kept together
// (rather than inline per route) so the DB-column ↔ schema correspondence is
// easy to audit against src/db/schema.ts in one place.
import { z } from "zod";

export const uuidSchema = z.string().uuid("Deve essere un id valido (uuid)");
// Postgres `numeric` columns: the app sends either a string (form inputs) or
// a number (computed values) depending on the call site. drizzle's insert/
// update types want a string for these columns, so accept either at the
// door but always normalize to string on the way out.
const numericValue = z.union([z.string(), z.number()]);
export const numericSchema = numericValue.transform((v) => v.toString());
export const nullableNumericSchema = numericValue
  .nullable()
  .transform((v) => (v === null ? null : v.toString()));
export const intSchema = z.coerce.number().int();

export const positionSchema = z.enum(["GK", "DF", "MF", "FW"]);
export const seasonStatusSchema = z.enum(["draft", "active", "finished", "archived"]);
export const marketSessionTypeSchema = z.enum([
  "initial_auction",
  "repair_summer",
  "repair_winter",
  "open_market",
]);
export const fixtureStatusSchema = z.enum([
  "scheduled",
  "played",
  "walkover_home",
  "walkover_away",
]);
export const financialTransactionTypeSchema = z.enum([
  "registration_league",
  "registration_cup",
  "registration_supercup",
  "fine_late_lineup",
  "prize",
  "abandonment_clause",
  "market_fee",
  "refund",
  "adjustment",
]);
export const lineupRoleSchema = z.enum(["starter", "bench"]);

// ---- seasons ----
export const createSeasonSchema = z.object({
  name: z.string().min(1),
  year: intSchema,
  status: seasonStatusSchema.optional(),
});
export const updateSeasonSchema = z.object({
  name: z.string().min(1).optional(),
  year: intSchema.optional(),
  status: seasonStatusSchema.optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

// ---- participants ----
export const createParticipantSchema = z.object({
  seasonId: uuidSchema,
  userId: z.string().min(1),
  displayName: z.string().min(1),
  teamName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
export const updateParticipantSchema = z.object({
  displayName: z.string().min(1).optional(),
  teamName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ---- players ----
export const createPlayerSchema = z.object({
  fullName: z.string().min(1),
  position: positionSchema,
  teamName: z.string().nullable().optional(),
  birthYear: intSchema.nullable().optional(),
  isUnder21: z.boolean().optional(),
  currentValue: nullableNumericSchema.optional(),
  status: z.string().nullable().optional(),
});
export const updatePlayerSchema = z.object({
  fullName: z.string().min(1).optional(),
  position: positionSchema.optional(),
  teamName: z.string().nullable().optional(),
  birthYear: intSchema.nullable().optional(),
  isUnder21: z.boolean().optional(),
  currentValue: nullableNumericSchema.optional(),
  initialValue: nullableNumericSchema.optional(),
  fvm: nullableNumericSchema.optional(),
  status: z.string().nullable().optional(),
});

// ---- rosters ----
export const createRosterSchema = z.object({
  seasonId: uuidSchema,
  participantId: uuidSchema,
  name: z.string().nullable().optional(),
  creditsRemaining: nullableNumericSchema.optional(),
});
export const updateRosterSchema = z.object({
  name: z.string().nullable().optional(),
  creditsRemaining: nullableNumericSchema.optional(),
});
export const addRosterPlayerSchema = z.object({
  playerId: uuidSchema,
  acquisitionPrice: nullableNumericSchema.optional(),
});
export const updateRosterPlayerSchema = z.object({
  acquisitionPrice: nullableNumericSchema.optional(),
  isActive: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

// ---- market ----
export const createMarketSessionSchema = z.object({
  seasonId: uuidSchema,
  type: marketSessionTypeSchema,
  label: z.string().min(1),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isOpen: z.boolean().optional(),
});
export const updateMarketSessionSchema = z.object({
  type: marketSessionTypeSchema.optional(),
  label: z.string().min(1).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});
export const createMarketMovementSchema = z.object({
  seasonId: uuidSchema,
  sessionId: uuidSchema.nullable().optional(),
  rosterIdFrom: uuidSchema.nullable().optional(),
  rosterIdTo: uuidSchema.nullable().optional(),
  playerId: uuidSchema.nullable().optional(),
  movementType: z.string().nullable().optional(),
  amount: nullableNumericSchema.optional(),
  creditDelta: nullableNumericSchema.optional(),
  notes: z.string().nullable().optional(),
});

// ---- fixtures ----
export const createFixtureSchema = z.object({
  seasonId: uuidSchema,
  matchdayNumber: intSchema,
  rosterIdHome: uuidSchema.nullable().optional(),
  rosterIdAway: uuidSchema.nullable().optional(),
  status: fixtureStatusSchema.optional(),
});
export const updateFixtureSchema = z.object({
  rosterIdHome: uuidSchema.nullable().optional(),
  rosterIdAway: uuidSchema.nullable().optional(),
  scoreHome: nullableNumericSchema.optional(),
  scoreAway: nullableNumericSchema.optional(),
  goalsHome: intSchema.nullable().optional(),
  goalsAway: intSchema.nullable().optional(),
  status: fixtureStatusSchema.optional(),
});
export const syncFixtureResultsSchema = z.object({
  seasonId: uuidSchema,
  competitionId: z.union([z.string(), z.number()]),
});

// ---- lineups ----
export const createLineupSchema = z.object({
  seasonId: uuidSchema,
  rosterId: uuidSchema,
  matchdayNumber: intSchema,
  formation: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  players: z
    .array(
      z.object({
        playerId: uuidSchema,
        role: lineupRoleSchema,
        positionIndex: intSchema.nullable().optional(),
      })
    )
    .optional(),
});

// ---- scores ----
const scoreFields = {
  vote: nullableNumericSchema.optional(),
  goals: intSchema.nullable().optional(),
  assists: intSchema.nullable().optional(),
  penaltiesScored: intSchema.nullable().optional(),
  penaltiesMissed: intSchema.nullable().optional(),
  penaltiesSaved: intSchema.nullable().optional(),
  cleanSheet: z.boolean().nullable().optional(),
  goalsConceded: intSchema.nullable().optional(),
  ownGoals: intSchema.nullable().optional(),
  yellowCards: intSchema.nullable().optional(),
  redCards: intSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
};
export const createScoreSchema = z.object({
  seasonId: uuidSchema,
  fixtureId: uuidSchema.nullable().optional(),
  rosterId: uuidSchema.nullable().optional(),
  playerId: uuidSchema,
  matchdayNumber: intSchema,
  ...scoreFields,
});
export const updateScoreSchema = z.object(scoreFields);
export const syncLineupsSchema = z.object({
  seasonId: uuidSchema,
  matchdayNumber: intSchema,
});
export const importScoresSchema = z.object({
  seasonId: uuidSchema,
  matchdayNumber: intSchema,
  fantacalcioSeason: z.string().min(1),
  fantacalcioMatchday: intSchema,
});

// ---- finance ----
export const createFinancialTransactionSchema = z.object({
  seasonId: uuidSchema,
  participantId: uuidSchema.nullable().optional(),
  type: financialTransactionTypeSchema,
  amount: numericSchema,
  description: z.string().nullable().optional(),
});

// ---- trades ----
export const createTradeSchema = z.object({
  seasonId: uuidSchema,
  rosterIdA: uuidSchema,
  rosterIdB: uuidSchema,
  playersFromA: z.array(uuidSchema).optional(),
  playersFromB: z.array(uuidSchema).optional(),
  creditsDeltaA: nullableNumericSchema.optional(),
  creditsDeltaB: nullableNumericSchema.optional(),
  notes: z.string().nullable().optional(),
});
