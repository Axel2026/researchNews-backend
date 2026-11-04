import { eq } from 'drizzle-orm';
import { listArticles } from '../articles/repository';
import type { ArticleListItem } from '../articles/types';
import type { Locale } from '../articles/locale';
import { db } from '../db/client';
import { articles, users } from '../db/schema';
import { applyBookmark } from './slugs';

export type BookmarkList = {
  slugs: string[];
  articles: ArticleListItem[];
};

async function getOrCreateUser(userId: string) {
  const existing = await db
    .select({
      id: users.id,
      bookmarkedSlugs: users.bookmarkedSlugs,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  await db
    .insert(users)
    .values({ id: userId, bookmarkedSlugs: [] })
    .onConflictDoNothing();

  const created = await db
    .select({
      id: users.id,
      bookmarkedSlugs: users.bookmarkedSlugs,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return created[0] ?? { id: userId, bookmarkedSlugs: [] as string[] };
}

async function articleExists(slug: string): Promise<boolean> {
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  return Boolean(rows[0]);
}

export async function listBookmarks(
  userId: string,
  locale: Locale,
): Promise<BookmarkList> {
  const user = await getOrCreateUser(userId);
  const slugs = user.bookmarkedSlugs;
  const all = await listArticles(locale);
  const bySlug = new Map(all.map((article) => [article.slug, article]));

  return {
    slugs,
    articles: slugs.flatMap((slug) => {
      const article = bySlug.get(slug);
      return article ? [article] : [];
    }),
  };
}

export async function setBookmark(
  userId: string,
  slug: string,
  bookmarked: boolean,
): Promise<{ slugs: string[]; bookmarked: boolean } | 'not_found'> {
  if (bookmarked && !(await articleExists(slug))) {
    return 'not_found';
  }

  const user = await getOrCreateUser(userId);
  const slugs = applyBookmark(user.bookmarkedSlugs, slug, bookmarked);

  await db
    .update(users)
    .set({ bookmarkedSlugs: slugs })
    .where(eq(users.id, userId));

  return { slugs, bookmarked: slugs.includes(slug) };
}
