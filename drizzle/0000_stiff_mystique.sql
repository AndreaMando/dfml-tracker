CREATE TYPE "public"."financial_transaction_type" AS ENUM('registration_league', 'registration_cup', 'registration_supercup', 'fine_late_lineup', 'prize', 'abandonment_clause', 'market_fee', 'refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."fixture_status" AS ENUM('scheduled', 'played', 'walkover_home', 'walkover_away');--> statement-breakpoint
CREATE TYPE "public"."lineup_role" AS ENUM('starter', 'bench');--> statement-breakpoint
CREATE TYPE "public"."market_session_type" AS ENUM('initial_auction', 'repair_1', 'repair_2', 'free_trade');--> statement-breakpoint
CREATE TYPE "public"."player_position" AS ENUM('GK', 'DF', 'MF', 'FW');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('draft', 'active', 'finished', 'archived');--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"participant_id" uuid,
	"type" "financial_transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"max_participants" integer,
	"initial_credits" numeric(10, 2),
	"roster_size" integer,
	"bench_size" integer,
	"min_under21" integer,
	"credit_renewal_policy" text,
	"rules_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lineup_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lineup_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"role" "lineup_role" NOT NULL,
	"position_index" integer
);
--> statement-breakpoint
CREATE TABLE "market_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"session_id" uuid,
	"roster_id_from" uuid,
	"roster_id_to" uuid,
	"player_id" uuid,
	"movement_type" text,
	"amount" numeric(10, 2),
	"credit_delta" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"type" "market_session_type" NOT NULL,
	"label" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_open" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "matchday_fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"matchday_number" integer NOT NULL,
	"roster_id_home" uuid,
	"roster_id_away" uuid,
	"score_home" numeric(10, 2),
	"score_away" numeric(10, 2),
	"status" "fixture_status" DEFAULT 'scheduled' NOT NULL,
	"played_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchday_lineups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"roster_id" uuid NOT NULL,
	"matchday_number" integer NOT NULL,
	"formation" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchday_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"fixture_id" uuid,
	"roster_id" uuid,
	"player_id" uuid NOT NULL,
	"matchday_number" integer NOT NULL,
	"score" numeric(10, 2),
	"goals" integer,
	"assists" integer,
	"penalties_scored" integer,
	"penalties_saved" integer,
	"clean_sheet" boolean,
	"goals_conceded" integer,
	"yellow_cards" integer,
	"red_cards" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"team_name" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"full_name" text NOT NULL,
	"position" "player_position" NOT NULL,
	"team_name" text,
	"birth_year" integer,
	"is_under21" boolean DEFAULT false,
	"current_value" numeric(10, 2),
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roster_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"acquired_at" timestamp NOT NULL,
	"acquisition_price" numeric(10, 2),
	"slot_locked_until_session_id" uuid,
	"is_active" boolean DEFAULT true,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"name" text,
	"credits_remaining" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"status" "season_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"roster_id" uuid NOT NULL,
	"played" integer DEFAULT 0,
	"won" integer DEFAULT 0,
	"drawn" integer DEFAULT 0,
	"lost" integer DEFAULT 0,
	"points" integer DEFAULT 0,
	"total_score" numeric(10, 2),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_settings" ADD CONSTRAINT "league_settings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_lineup_id_matchday_lineups_id_fk" FOREIGN KEY ("lineup_id") REFERENCES "public"."matchday_lineups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_movements" ADD CONSTRAINT "market_movements_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_movements" ADD CONSTRAINT "market_movements_session_id_market_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."market_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_movements" ADD CONSTRAINT "market_movements_roster_id_from_rosters_id_fk" FOREIGN KEY ("roster_id_from") REFERENCES "public"."rosters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_movements" ADD CONSTRAINT "market_movements_roster_id_to_rosters_id_fk" FOREIGN KEY ("roster_id_to") REFERENCES "public"."rosters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_movements" ADD CONSTRAINT "market_movements_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_sessions" ADD CONSTRAINT "market_sessions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_fixtures" ADD CONSTRAINT "matchday_fixtures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_fixtures" ADD CONSTRAINT "matchday_fixtures_roster_id_home_rosters_id_fk" FOREIGN KEY ("roster_id_home") REFERENCES "public"."rosters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_fixtures" ADD CONSTRAINT "matchday_fixtures_roster_id_away_rosters_id_fk" FOREIGN KEY ("roster_id_away") REFERENCES "public"."rosters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_lineups" ADD CONSTRAINT "matchday_lineups_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_lineups" ADD CONSTRAINT "matchday_lineups_roster_id_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_scores" ADD CONSTRAINT "matchday_scores_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_scores" ADD CONSTRAINT "matchday_scores_fixture_id_matchday_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."matchday_fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_scores" ADD CONSTRAINT "matchday_scores_roster_id_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchday_scores" ADD CONSTRAINT "matchday_scores_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_players" ADD CONSTRAINT "roster_players_roster_id_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_players" ADD CONSTRAINT "roster_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_players" ADD CONSTRAINT "roster_players_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_players" ADD CONSTRAINT "roster_players_slot_locked_until_session_id_market_sessions_id_fk" FOREIGN KEY ("slot_locked_until_session_id") REFERENCES "public"."market_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_roster_id_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_settings_season_unique" ON "league_settings" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matchday_lineups_roster_matchday_unique" ON "matchday_lineups" USING btree ("roster_id","matchday_number");--> statement-breakpoint
CREATE UNIQUE INDEX "rosters_season_participant_unique" ON "rosters" USING btree ("season_id","participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "standings_season_roster_unique" ON "standings" USING btree ("season_id","roster_id");