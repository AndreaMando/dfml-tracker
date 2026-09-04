CREATE TYPE "public"."competition" AS ENUM('league', 'cup');--> statement-breakpoint
DROP INDEX "matchday_fixtures_season_matchday_pairing_unique";--> statement-breakpoint
DROP INDEX "matchday_lineups_roster_matchday_unique";--> statement-breakpoint
ALTER TABLE "matchday_fixtures" ADD COLUMN "competition" "competition" DEFAULT 'league' NOT NULL;--> statement-breakpoint
ALTER TABLE "matchday_fixtures" ADD COLUMN "linked_matchday_number" integer;--> statement-breakpoint
ALTER TABLE "matchday_lineups" ADD COLUMN "competition" "competition" DEFAULT 'league' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "matchday_fixtures_season_matchday_pairing_unique" ON "matchday_fixtures" USING btree ("season_id","matchday_number","roster_id_home","roster_id_away","competition");--> statement-breakpoint
CREATE UNIQUE INDEX "matchday_lineups_roster_matchday_unique" ON "matchday_lineups" USING btree ("roster_id","matchday_number","competition");