CREATE TABLE "credits_bonus_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"bonus" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings_penalties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"roster_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roster_players" ADD COLUMN "acquisition_initial_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "credits_bonus_rules" ADD CONSTRAINT "credits_bonus_rules_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_penalties" ADD CONSTRAINT "standings_penalties_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_penalties" ADD CONSTRAINT "standings_penalties_roster_id_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credits_bonus_rules_season_rank_unique" ON "credits_bonus_rules" USING btree ("season_id","rank");