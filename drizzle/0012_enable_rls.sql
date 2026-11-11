ALTER TABLE "article_translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "article_view_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_ai_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."article_translations" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."article_view_days" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."articles" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."comments" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."source_translations" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."sources" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."user_ai_keys" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "public"."users" FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;