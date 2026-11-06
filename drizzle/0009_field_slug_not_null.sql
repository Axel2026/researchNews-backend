-- Rows that already exist stay nullable until db:backfill-field-slug fills them.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "articles" WHERE "field_slug" IS NULL) THEN
    ALTER TABLE "articles" ALTER COLUMN "field_slug" SET NOT NULL;
  END IF;
END $$;