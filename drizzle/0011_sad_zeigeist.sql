ALTER TABLE "articles" ADD COLUMN "popularization_model" text;--> statement-breakpoint
ALTER TABLE "user_ai_keys" ADD COLUMN "model" text;--> statement-breakpoint
UPDATE "user_ai_keys" SET "model" = CASE "provider"
  WHEN 'openai' THEN 'gpt-6.1-sol'
  WHEN 'xai' THEN 'grok-4.7'
  WHEN 'anthropic' THEN 'claude-sonnet-5-5'
END
WHERE "model" IS NULL;--> statement-breakpoint
ALTER TABLE "user_ai_keys" ALTER COLUMN "model" SET NOT NULL;