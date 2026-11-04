ALTER TABLE "articles" ADD COLUMN "paper_published_at" timestamp with time zone;--> statement-breakpoint
UPDATE "articles" SET "paper_published_at" = "published_at" WHERE "paper_published_at" IS NULL;