ALTER TABLE "market_sessions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."market_session_type";--> statement-breakpoint
CREATE TYPE "public"."market_session_type" AS ENUM('initial_auction', 'repair_summer', 'repair_winter');--> statement-breakpoint
ALTER TABLE "market_sessions" ALTER COLUMN "type" SET DATA TYPE "public"."market_session_type" USING "type"::"public"."market_session_type";