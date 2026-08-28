CREATE TABLE "trade_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"from_roster_id" uuid NOT NULL,
	"to_roster_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"roster_id_a" uuid NOT NULL,
	"roster_id_b" uuid NOT NULL,
	"credits_delta_a" numeric(10, 2),
	"credits_delta_b" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_players" ADD CONSTRAINT "trade_players_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_players" ADD CONSTRAINT "trade_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_players" ADD CONSTRAINT "trade_players_from_roster_id_rosters_id_fk" FOREIGN KEY ("from_roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_players" ADD CONSTRAINT "trade_players_to_roster_id_rosters_id_fk" FOREIGN KEY ("to_roster_id") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_roster_id_a_rosters_id_fk" FOREIGN KEY ("roster_id_a") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_roster_id_b_rosters_id_fk" FOREIGN KEY ("roster_id_b") REFERENCES "public"."rosters"("id") ON DELETE cascade ON UPDATE no action;