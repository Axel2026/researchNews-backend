CREATE TABLE "article_view_days" (
	"article_id" text NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "article_view_days_article_id_day_pk" PRIMARY KEY("article_id","day"),
	CONSTRAINT "article_view_days_views_positive" CHECK ("article_view_days"."views" >= 1)
);
--> statement-breakpoint
ALTER TABLE "article_view_days" ADD CONSTRAINT "article_view_days_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_view_days_day_idx" ON "article_view_days" USING btree ("day");