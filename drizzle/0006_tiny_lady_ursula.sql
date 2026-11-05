CREATE TABLE "source_translations" (
	"source_id" text NOT NULL,
	"locale" text NOT NULL,
	"summary" text NOT NULL,
	CONSTRAINT "source_translations_source_id_locale_pk" PRIMARY KEY("source_id","locale")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_translations" ADD CONSTRAINT "source_translations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "sources" ("id", "name", "url", "position")
VALUES ('core', 'CORE API', 'https://core.ac.uk/', 0);
--> statement-breakpoint
INSERT INTO "source_translations" ("source_id", "locale", "summary")
VALUES
  ('core', 'pl', 'Otwarte repozytorium prac naukowych. Stąd pobieramy artykuły z czasopism takich jak Nature, Science, Cell, Lancet i PNAS.'),
  ('core', 'en', 'An open repository of research papers. We fetch articles from journals such as Nature, Science, Cell, Lancet and PNAS.'),
  ('core', 'de', 'Ein offenes Repositorium für Forschungsarbeiten. Von hier holen wir Artikel aus Zeitschriften wie Nature, Science, Cell, Lancet und PNAS.'),
  ('core', 'fr', 'Un dépôt ouvert de travaux de recherche. Nous y prenons des articles de revues telles que Nature, Science, Cell, Lancet et PNAS.'),
  ('core', 'es', 'Un repositorio abierto de trabajos de investigación. De aquí tomamos artículos de revistas como Nature, Science, Cell, Lancet y PNAS.');