ALTER TABLE "matchday_scores" ADD COLUMN "vote" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "matchday_scores" ADD COLUMN "penalties_missed" integer;--> statement-breakpoint
ALTER TABLE "matchday_scores" ADD COLUMN "own_goals" integer;