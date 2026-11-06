ALTER TABLE "articles" ADD COLUMN "field_slug" text;--> statement-breakpoint
CREATE INDEX "articles_field_slug_idx" ON "articles" USING btree ("field_slug");