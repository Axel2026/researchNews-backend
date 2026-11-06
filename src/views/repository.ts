import { eq, sql } from 'drizzle-orm';
import { utcDayString } from '../articles/views';
import { db } from '../db/client';
import { articles, articleViewDays } from '../db/schema';

export async function recordArticleView(
  slug: string,
): Promise<'ok' | 'not_found'> {
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  const article = rows[0];
  if (!article) {
    return 'not_found';
  }

  const day = utcDayString(new Date());

  await db
    .insert(articleViewDays)
    .values({ articleId: article.id, day, views: 1 })
    .onConflictDoUpdate({
      target: [articleViewDays.articleId, articleViewDays.day],
      set: { views: sql`${articleViewDays.views} + 1` },
    });

  return 'ok';
}
