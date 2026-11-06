import { and, desc, eq, isNotNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/client';
import { articles, articleTranslations, articleViewDays } from '../db/schema';
import { RECENT_VIEW_DAYS, utcDayString } from './views';
import { env } from '../env';
import {
  articlesForCategorySlug,
  slugifyField,
  uniqueCategories,
} from './category';
import { articleImageUrl } from './image';
import { FALLBACK_LOCALE, type Locale } from './locale';
import { resolveSourceUrl } from '../core/map';
import { ilikeContainsPattern, type ArticleListSort } from './search';
import { sortArticlesByPublicationDate } from './sort';
import type {
  ArticleCategory,
  ArticleCategoryDetail,
  ArticleDetail,
  ArticleListItem,
} from './types';

const polish = alias(articleTranslations, 'pl');
const requested = alias(articleTranslations, 'requested');

function toIso(value: Date): string {
  return value.toISOString();
}

function toNullableIso(value: Date | null): string | null {
  return value ? toIso(value) : null;
}

function publicImageUrl(
  slug: string,
  storedUrl: string,
  hasImage: boolean,
): string {
  return articleImageUrl({
    slug,
    storedUrl,
    hasStoredImage: hasImage,
    publicBase: env.API_PUBLIC_URL,
  });
}

const recentViews = db
  .select({
    articleId: articleViewDays.articleId,
    views: sql<number>`cast(sum(${articleViewDays.views}) as int)`.as('views'),
  })
  .from(articleViewDays)
  .where(
    sql`${articleViewDays.day} >= current_date - ${sql.raw(String(RECENT_VIEW_DAYS - 1))}`,
  )
  .groupBy(articleViewDays.articleId)
  .as('recent_views');

const publicationDateDesc = sql`coalesce(${articles.paperPublishedAt}, ${articles.publishedAt}) desc`;

export async function listArticles(
  locale: Locale,
  options: {
    query?: string;
    sort?: ArticleListSort;
    author?: string;
    field?: string;
    start?: Date;
    endExclusive?: Date;
  } = {},
): Promise<ArticleListItem[]> {
  const conditions = [];

  if (options.query) {
    const pattern = ilikeContainsPattern(options.query);
    conditions.push(
      or(
        sql`coalesce(${requested.title}, ${polish.title}) ilike ${pattern}`,
        sql`coalesce(${requested.shortPopularization}, ${polish.shortPopularization}) ilike ${pattern}`,
        sql`coalesce(${requested.field}, ${polish.field}) ilike ${pattern}`,
        sql`${articles.realTitle} ilike ${pattern}`,
      ),
    );
  }

  if (options.author) {
    conditions.push(
      sql`exists (
        select 1
        from unnest(${articles.authors}) as author_name
        where author_name ilike ${ilikeContainsPattern(options.author)}
      )`,
    );
  }

  if (options.start) {
    conditions.push(
      sql`coalesce(${articles.paperPublishedAt}, ${articles.publishedAt}) >= ${options.start.toISOString()}`,
    );
  }

  if (options.endExclusive) {
    conditions.push(
      sql`coalesce(${articles.paperPublishedAt}, ${articles.publishedAt}) < ${options.endExclusive.toISOString()}`,
    );
  }

  const orderBy =
    options.sort === 'popular'
      ? [sql`coalesce(${recentViews.views}, 0) desc`, publicationDateDesc]
      : options.sort === 'newest'
        ? [publicationDateDesc]
        : [desc(articles.featured), publicationDateDesc];

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      hasImage: isNotNull(articles.imageContentType),
      publishedAt: articles.publishedAt,
      paperPublishedAt: articles.paperPublishedAt,
      featured: articles.featured,
      recentViews: recentViews.views,
      title: requested.title,
      field: requested.field,
      shortPopularization: requested.shortPopularization,
      fallbackTitle: polish.title,
      fallbackField: polish.field,
      fallbackShortPopularization: polish.shortPopularization,
    })
    .from(articles)
    .innerJoin(
      polish,
      and(
        eq(polish.articleId, articles.id),
        eq(polish.locale, FALLBACK_LOCALE),
      ),
    )
    .leftJoin(
      requested,
      and(eq(requested.articleId, articles.id), eq(requested.locale, locale)),
    )
    .leftJoin(recentViews, eq(recentViews.articleId, articles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(...orderBy);

  const items = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title ?? row.fallbackTitle,
    field: row.field ?? row.fallbackField,
    fieldSlug: slugifyField(row.fallbackField),
    shortPopularization:
      row.shortPopularization ?? row.fallbackShortPopularization,
    imageUrl: publicImageUrl(row.slug, row.imageUrl, Boolean(row.hasImage)),
    publishedAt: toIso(row.publishedAt),
    paperPublishedAt: toNullableIso(row.paperPublishedAt),
    featured: row.featured,
    recentViews: row.recentViews ?? 0,
  }));

  if (!options.field) {
    return items;
  }

  return articlesForCategorySlug(items, options.field);
}

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

export async function getArticleBySlug(
  slug: string,
  locale: Locale,
): Promise<ArticleDetail | undefined> {
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      authors: articles.authors,
      realTitle: articles.realTitle,
      imageUrl: articles.imageUrl,
      hasImage: isNotNull(articles.imageContentType),
      publishedAt: articles.publishedAt,
      paperPublishedAt: articles.paperPublishedAt,
      featured: articles.featured,
      doi: articles.doi,
      year: articles.year,
      journal: articles.journal,
      sourceUrl: articles.sourceUrl,
      downloadUrl: articles.downloadUrl,
      title: requested.title,
      field: requested.field,
      shortPopularization: requested.shortPopularization,
      mediumPopularization: requested.mediumPopularization,
      fullPopularization: requested.fullPopularization,
      fallbackTitle: polish.title,
      fallbackField: polish.field,
      fallbackShortPopularization: polish.shortPopularization,
      fallbackMediumPopularization: polish.mediumPopularization,
      fallbackFullPopularization: polish.fullPopularization,
    })
    .from(articles)
    .innerJoin(
      polish,
      and(
        eq(polish.articleId, articles.id),
        eq(polish.locale, FALLBACK_LOCALE),
      ),
    )
    .leftJoin(
      requested,
      and(eq(requested.articleId, articles.id), eq(requested.locale, locale)),
    )
    .where(eq(articles.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    slug: row.slug,
    authors: row.authors,
    field: row.field ?? row.fallbackField,
    fieldSlug: slugifyField(row.fallbackField),
    title: row.title ?? row.fallbackTitle,
    realTitle: row.realTitle,
    shortPopularization:
      row.shortPopularization ?? row.fallbackShortPopularization,
    mediumPopularization:
      row.mediumPopularization ?? row.fallbackMediumPopularization,
    fullPopularization:
      row.fullPopularization ?? row.fallbackFullPopularization,
    imageUrl: publicImageUrl(row.slug, row.imageUrl, Boolean(row.hasImage)),
    publishedAt: toIso(row.publishedAt),
    paperPublishedAt: toNullableIso(row.paperPublishedAt),
    featured: row.featured,
    recentViews: 0,
    doi: row.doi,
    year: row.year,
    journal: row.journal,
    sourceUrl: resolveSourceUrl(row.doi, row.sourceUrl),
    downloadUrl: row.downloadUrl,
  };
}

export async function listCategories(
  locale: Locale,
): Promise<ArticleCategory[]> {
  return uniqueCategories(await listArticles(locale));
}

export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
): Promise<ArticleCategoryDetail | undefined> {
  const articles = sortArticlesByPublicationDate(
    articlesForCategorySlug(await listArticles(locale), slug),
  );
  const field = articles[0]?.field;

  if (!field) {
    return undefined;
  }

  return { slug, field, articles };
}

export async function getArticleImage(
  slug: string,
): Promise<{ bytes: Buffer; contentType: string } | undefined> {
  const rows = await db
    .select({
      image: articles.image,
      contentType: articles.imageContentType,
    })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row?.image || !row.contentType) {
    return undefined;
  }

  const bytes = Buffer.isBuffer(row.image) ? row.image : Buffer.from(row.image);

  return { bytes, contentType: row.contentType };
}
