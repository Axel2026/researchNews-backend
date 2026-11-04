CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"bookmarked_slugs" text[] DEFAULT '{}'::text[] NOT NULL
);
