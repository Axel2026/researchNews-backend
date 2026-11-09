CREATE TABLE "user_ai_keys" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"wrapped_dek" "bytea" NOT NULL,
	"wrap_nonce" "bytea" NOT NULL,
	"wrap_tag" "bytea" NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"nonce" "bytea" NOT NULL,
	"tag" "bytea" NOT NULL,
	"kek_version" integer NOT NULL,
	"last4" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_ai_keys_user_id_provider_pk" PRIMARY KEY("user_id","provider"),
	CONSTRAINT "user_ai_keys_provider" CHECK ("user_ai_keys"."provider" in ('openai', 'xai', 'anthropic')),
	CONSTRAINT "user_ai_keys_last4_len" CHECK (char_length("user_ai_keys"."last4") = 4),
	CONSTRAINT "user_ai_keys_kek_version" CHECK ("user_ai_keys"."kek_version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "abstract" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "popularized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "popularized_by" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "popularizing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "popularizing_by" text;--> statement-breakpoint
ALTER TABLE "user_ai_keys" ADD CONSTRAINT "user_ai_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_popularized_by_users_id_fk" FOREIGN KEY ("popularized_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_popularizing_by_users_id_fk" FOREIGN KEY ("popularizing_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "articles" AS a
SET "abstract" = pl.full_popularization
FROM "article_translations" AS pl
WHERE pl.article_id = a.id
  AND pl.locale = 'pl'
  AND pl.title = a.real_title
  AND pl.medium_popularization = pl.full_popularization
  AND (
    NOT EXISTS (
      SELECT 1
      FROM "article_translations" AS en
      WHERE en.article_id = a.id
        AND en.locale = 'en'
    )
    OR EXISTS (
      SELECT 1
      FROM "article_translations" AS en
      WHERE en.article_id = a.id
        AND en.locale = 'en'
        AND en.title = a.real_title
        AND en.medium_popularization = en.full_popularization
        AND en.full_popularization = pl.full_popularization
    )
  );--> statement-breakpoint
UPDATE "articles"
SET "popularized_at" = "published_at"
WHERE "abstract" IS NULL;