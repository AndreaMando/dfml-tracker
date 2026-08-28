ALTER TABLE "players" ADD COLUMN "initial_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "fvm" numeric(10, 2);--> statement-breakpoint
CREATE UNIQUE INDEX "participants_season_display_name_unique" ON "participants" USING btree ("season_id","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "players_external_id_unique" ON "players" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roster_players_roster_player_unique" ON "roster_players" USING btree ("roster_id","player_id");