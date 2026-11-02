CREATE TABLE "article_translations" (
	"article_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"field" text NOT NULL,
	"short_popularization" text NOT NULL,
	"medium_popularization" text NOT NULL,
	"full_popularization" text NOT NULL,
	CONSTRAINT "article_translations_article_id_locale_pk" PRIMARY KEY("article_id","locale")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"authors" text[] NOT NULL,
	"real_title" text NOT NULL,
	"image_url" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"doi" text,
	"year" integer,
	"journal" text,
	"source_url" text,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_authors_min" CHECK (cardinality("articles"."authors") >= 1)
);
--> statement-breakpoint
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;