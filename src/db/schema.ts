import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const seasonStatusEnum = pgEnum("season_status", [
  "draft",
  "active",
  "finished",
  "archived",
]);

export const marketSessionTypeEnum = pgEnum("market_session_type", [
  "initial_auction",
  "repair_1",
  "repair_2",
  "free_trade",
]);

export const lineupRoleEnum = pgEnum("lineup_role", ["starter", "bench"]);

export const playerPositionEnum = pgEnum("player_position", [
  "GK",
  "DF",
  "MF",
  "FW",
]);

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "scheduled",
  "played",
  "walkover_home",
  "walkover_away",
]);

export const financialTransactionTypeEnum = pgEnum(
  "financial_transaction_type",
  [
    "registration_league",
    "registration_cup",
    "registration_supercup",
    "fine_late_lineup",
    "prize",
    "abandonment_clause",
    "market_fee",
    "refund",
    "adjustment",
  ]
);

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  status: seasonStatusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueSettings = pgTable(
  "league_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    maxParticipants: integer("max_participants"),
    initialCredits: numeric("initial_credits", { precision: 10, scale: 2 }),
    rosterSize: integer("roster_size"),
    benchSize: integer("bench_size"),
    minUnder21: integer("min_under21"),
    creditRenewalPolicy: text("credit_renewal_policy"),
    rulesVersion: text("rules_version"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    seasonUnique: uniqueIndex("league_settings_season_unique").on(table.seasonId),
  })
);

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  teamName: text("team_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id"),
  fullName: text("full_name").notNull(),
  position: playerPositionEnum("position").notNull(),
  teamName: text("team_name"),
  birthYear: integer("birth_year"),
  isUnder21: boolean("is_under21").default(false),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rosters = pgTable(
  "rosters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    name: text("name"),
    creditsRemaining: numeric("credits_remaining", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    seasonParticipantUnique: uniqueIndex("rosters_season_participant_unique").on(
      table.seasonId,
      table.participantId
    ),
  })
);

export const marketSessions = pgTable("market_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  type: marketSessionTypeEnum("type").notNull(),
  label: text("label").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isOpen: boolean("is_open").default(true),
});

export const rosterPlayers = pgTable("roster_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  rosterId: uuid("roster_id")
    .notNull()
    .references(() => rosters.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  acquiredAt: timestamp("acquired_at").notNull(),
  acquisitionPrice: numeric("acquisition_price", { precision: 10, scale: 2 }),
  slotLockedUntilSessionId: uuid("slot_locked_until_session_id").references(
    () => marketSessions.id,
    { onDelete: "set null" }
  ),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
});

// Note: the regulation-specific partial unique index for active players can be added later
// in a manual SQL migration if needed for this Drizzle version.

export const marketMovements = pgTable("market_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => marketSessions.id, {
    onDelete: "cascade",
  }),
  rosterIdFrom: uuid("roster_id_from").references(() => rosters.id),
  rosterIdTo: uuid("roster_id_to").references(() => rosters.id),
  playerId: uuid("player_id").references(() => players.id),
  movementType: text("movement_type"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  creditDelta: numeric("credit_delta", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchdayLineups = pgTable(
  "matchday_lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => rosters.id, { onDelete: "cascade" }),
    matchdayNumber: integer("matchday_number").notNull(),
    formation: text("formation"),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    rosterMatchdayUnique: uniqueIndex("matchday_lineups_roster_matchday_unique").on(
      table.rosterId,
      table.matchdayNumber
    ),
  })
);

export const lineupPlayers = pgTable("lineup_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineupId: uuid("lineup_id")
    .notNull()
    .references(() => matchdayLineups.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  role: lineupRoleEnum("role").notNull(),
  positionIndex: integer("position_index"),
});

export const matchdayFixtures = pgTable("matchday_fixtures", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  matchdayNumber: integer("matchday_number").notNull(),
  rosterIdHome: uuid("roster_id_home").references(() => rosters.id),
  rosterIdAway: uuid("roster_id_away").references(() => rosters.id),
  scoreHome: numeric("score_home", { precision: 10, scale: 2 }),
  scoreAway: numeric("score_away", { precision: 10, scale: 2 }),
  status: fixtureStatusEnum("status").notNull().default("scheduled"),
  playedAt: timestamp("played_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchdayScores = pgTable("matchday_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  fixtureId: uuid("fixture_id").references(() => matchdayFixtures.id, {
    onDelete: "cascade",
  }),
  rosterId: uuid("roster_id").references(() => rosters.id, {
    onDelete: "cascade",
  }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  matchdayNumber: integer("matchday_number").notNull(),
  score: numeric("score", { precision: 10, scale: 2 }),
  goals: integer("goals"),
  assists: integer("assists"),
  penaltiesScored: integer("penalties_scored"),
  penaltiesSaved: integer("penalties_saved"),
  cleanSheet: boolean("clean_sheet"),
  goalsConceded: integer("goals_conceded"),
  yellowCards: integer("yellow_cards"),
  redCards: integer("red_cards"),
  notes: text("notes"),
});

export const standings = pgTable(
  "standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => rosters.id, { onDelete: "cascade" }),
    played: integer("played").default(0),
    won: integer("won").default(0),
    drawn: integer("drawn").default(0),
    lost: integer("lost").default(0),
    points: integer("points").default(0),
    totalScore: numeric("total_score", { precision: 10, scale: 2 }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    seasonRosterUnique: uniqueIndex("standings_season_roster_unique").on(
      table.seasonId,
      table.rosterId
    ),
  })
);

export const financialTransactions = pgTable("financial_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id").references(() => participants.id, {
    onDelete: "cascade",
  }),
  type: financialTransactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const seasonsRelations = relations(seasons, ({ many }) => ({
  leagueSettings: many(leagueSettings),
  participants: many(participants),
  rosters: many(rosters),
  marketSessions: many(marketSessions),
  matchdayLineups: many(matchdayLineups),
  matchdayFixtures: many(matchdayFixtures),
  matchdayScores: many(matchdayScores),
  standings: many(standings),
  financialTransactions: many(financialTransactions),
}));

export const leagueSettingsRelations = relations(leagueSettings, ({ one }) => ({
  season: one(seasons, {
    fields: [leagueSettings.seasonId],
    references: [seasons.id],
  }),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  season: one(seasons, {
    fields: [participants.seasonId],
    references: [seasons.id],
  }),
  rosters: many(rosters),
  financialTransactions: many(financialTransactions),
}));

export const playersRelations = relations(players, ({ many }) => ({
  rosterPlayers: many(rosterPlayers),
  lineupPlayers: many(lineupPlayers),
  matchdayScores: many(matchdayScores),
}));

export const rostersRelations = relations(rosters, ({ one, many }) => ({
  season: one(seasons, {
    fields: [rosters.seasonId],
    references: [seasons.id],
  }),
  participant: one(participants, {
    fields: [rosters.participantId],
    references: [participants.id],
  }),
  rosterPlayers: many(rosterPlayers),
  matchdayLineups: many(matchdayLineups),
  homeFixtures: many(matchdayFixtures, { relationName: "homeFixtures" }),
  awayFixtures: many(matchdayFixtures, { relationName: "awayFixtures" }),
  standings: many(standings),
}));

export const rosterPlayersRelations = relations(rosterPlayers, ({ one }) => ({
  roster: one(rosters, {
    fields: [rosterPlayers.rosterId],
    references: [rosters.id],
  }),
  player: one(players, {
    fields: [rosterPlayers.playerId],
    references: [players.id],
  }),
  season: one(seasons, {
    fields: [rosterPlayers.seasonId],
    references: [seasons.id],
  }),
  lockedUntilSession: one(marketSessions, {
    fields: [rosterPlayers.slotLockedUntilSessionId],
    references: [marketSessions.id],
  }),
}));

export const marketSessionsRelations = relations(marketSessions, ({ one, many }) => ({
  season: one(seasons, {
    fields: [marketSessions.seasonId],
    references: [seasons.id],
  }),
  movements: many(marketMovements),
  lockedRosterPlayers: many(rosterPlayers),
}));

export const marketMovementsRelations = relations(marketMovements, ({ one }) => ({
  season: one(seasons, {
    fields: [marketMovements.seasonId],
    references: [seasons.id],
  }),
  session: one(marketSessions, {
    fields: [marketMovements.sessionId],
    references: [marketSessions.id],
  }),
  fromRoster: one(rosters, {
    fields: [marketMovements.rosterIdFrom],
    references: [rosters.id],
  }),
  toRoster: one(rosters, {
    fields: [marketMovements.rosterIdTo],
    references: [rosters.id],
  }),
  player: one(players, {
    fields: [marketMovements.playerId],
    references: [players.id],
  }),
}));

export const matchdayLineupsRelations = relations(
  matchdayLineups,
  ({ one, many }) => ({
    season: one(seasons, {
      fields: [matchdayLineups.seasonId],
      references: [seasons.id],
    }),
    roster: one(rosters, {
      fields: [matchdayLineups.rosterId],
      references: [rosters.id],
    }),
    lineupPlayers: many(lineupPlayers),
  })
);

export const lineupPlayersRelations = relations(lineupPlayers, ({ one }) => ({
  lineup: one(matchdayLineups, {
    fields: [lineupPlayers.lineupId],
    references: [matchdayLineups.id],
  }),
  player: one(players, {
    fields: [lineupPlayers.playerId],
    references: [players.id],
  }),
}));

export const matchdayFixturesRelations = relations(
  matchdayFixtures,
  ({ one, many }) => ({
    season: one(seasons, {
      fields: [matchdayFixtures.seasonId],
      references: [seasons.id],
    }),
    homeRoster: one(rosters, {
      fields: [matchdayFixtures.rosterIdHome],
      references: [rosters.id],
      relationName: "homeFixtures",
    }),
    awayRoster: one(rosters, {
      fields: [matchdayFixtures.rosterIdAway],
      references: [rosters.id],
      relationName: "awayFixtures",
    }),
    scores: many(matchdayScores),
  })
);

export const matchdayScoresRelations = relations(matchdayScores, ({ one }) => ({
  season: one(seasons, {
    fields: [matchdayScores.seasonId],
    references: [seasons.id],
  }),
  fixture: one(matchdayFixtures, {
    fields: [matchdayScores.fixtureId],
    references: [matchdayFixtures.id],
  }),
  roster: one(rosters, {
    fields: [matchdayScores.rosterId],
    references: [rosters.id],
  }),
  player: one(players, {
    fields: [matchdayScores.playerId],
    references: [players.id],
  }),
}));

export const standingsRelations = relations(standings, ({ one }) => ({
  season: one(seasons, {
    fields: [standings.seasonId],
    references: [seasons.id],
  }),
  roster: one(rosters, {
    fields: [standings.rosterId],
    references: [rosters.id],
  }),
}));

export const financialTransactionsRelations = relations(
  financialTransactions,
  ({ one }) => ({
    season: one(seasons, {
      fields: [financialTransactions.seasonId],
      references: [seasons.id],
    }),
    participant: one(participants, {
      fields: [financialTransactions.participantId],
      references: [participants.id],
    }),
  })
);
