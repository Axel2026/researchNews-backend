import 'dotenv/config';
import { and, eq, sql } from 'drizzle-orm';
import { slugifyField } from '../articles/category';
import { FALLBACK_LOCALE } from '../articles/locale';
import { db, queryClient } from './client';
import { articles, articleTranslations } from './schema';

async function backfillFieldSlug(): Promise<void> {
  const rows = await db
    .select({
      id: articles.id,
      field: articleTranslations.field,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(
        eq(articleTranslations.articleId, articles.id),
        eq(articleTranslations.locale, FALLBACK_LOCALE),
      ),
    );

  for (const row of rows) {
    await db
      .update(articles)
      .set({ fieldSlug: slugifyField(row.field) })
      .where(eq(articles.id, row.id));
  }

  await db.execute(
    sql`alter table articles alter column field_slug set not null`,
  );
  console.log(`Backfilled field_slug for ${rows.length} articles`);
}

backfillFieldSlug()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
