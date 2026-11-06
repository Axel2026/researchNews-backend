import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/client';
import {
  articles,
  articleTranslations,
  articleViewDays,
  comments,
} from '../db/schema';
import { RECENT_VIEW_DAYS, utcDayString } from './views';
import { env } from '../env';
import { uniqueCategories } from './category';
import { articleImageUrl } from './image';
import { FALLBACK_LOCALE, type Locale } from './locale';
import { resolveSourceUrl } from '../core/map';
import {
  ARTICLE_PAGE_SIZE,
  ilikeContainsPattern,
  type ArticleListSort,
} from './search';
import type {
  ArticleCategory,
  ArticleCategoryDetail,
  ArticleDetail,
  ArticleListItem,
  ArticlePage,
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

const commentCounts = db
  .select({
    articleId: comments.articleId,
    commentCount: sql<number>`cast(count(*) as int)`.as('comment_count'),
  })
  .from(comments)
  .where(isNull(comments.deletedAt))
  .groupBy(comments.articleId)
  .as('comment_counts');

const publicationDateDesc = sql`coalesce(${articles.paperPublishedAt}, ${articles.publishedAt}) desc`;

type ArticleQueryOptions = {
  query?: string;
  sort?: ArticleListSort;
  author?: string;
  field?: string;
  start?: Date;
  endExclusive?: Date;
};

const articleListColumns = {
  id: articles.id,
  slug: articles.slug,
  authors: articles.authors,
  fieldSlug: articles.fieldSlug,
  imageUrl: articles.imageUrl,
  hasImage: isNotNull(articles.imageContentType),
  publishedAt: articles.publishedAt,
  paperPublishedAt: articles.paperPublishedAt,
  featured: articles.featured,
  recentViews: recentViews.views,
  commentCount: commentCounts.commentCount,
  title: requested.title,
  field: requested.field,
  shortPopularization: requested.shortPopularization,
  fallbackTitle: polish.title,
  fallbackField: polish.field,
  fallbackShortPopularization: polish.shortPopularization,
};

function polishJoin() {
  return and(
    eq(polish.articleId, articles.id),
    eq(polish.locale, FALLBACK_LOCALE),
  );
}

function requestedJoin(locale: Locale) {
  return and(
    eq(requested.articleId, articles.id),
    eq(requested.locale, locale),
  );
}

function articleConditions(options: ArticleQueryOptions): SQL[] {
  const conditions: SQL[] = [];

  if (options.query) {
    const pattern = ilikeContainsPattern(options.query);
    const matchesText = or(
      sql`coalesce(${requested.title}, ${polish.title}) ilike ${pattern}`,
      sql`coalesce(${requested.shortPopularization}, ${polish.shortPopularization}) ilike ${pattern}`,
      sql`coalesce(${requested.field}, ${polish.field}) ilike ${pattern}`,
      sql`${articles.realTitle} ilike ${pattern}`,
    );
    if (matchesText) {
      conditions.push(matchesText);
    }
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

  if (options.field) {
    conditions.push(eq(articles.fieldSlug, options.field));
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

  return conditions;
}

function articleOrder(sort: ArticleListSort | undefined): SQL[] {
  const idOrder = asc(articles.id);

  if (sort === 'popular') {
    return [
      sql`coalesce(${recentViews.views}, 0) desc`,
      publicationDateDesc,
      idOrder,
    ];
  }

  if (sort === 'newest') {
    return [publicationDateDesc, idOrder];
  }

  return [desc(articles.featured), publicationDateDesc, idOrder];
}

function articleWhere(options: ArticleQueryOptions) {
  const conditions = articleConditions(options);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

type ArticleListRow = {
  id: string;
  slug: string;
  authors: string[];
  fieldSlug: string;
  imageUrl: string;
  hasImage: unknown;
  publishedAt: Date;
  paperPublishedAt: Date | null;
  featured: boolean;
  recentViews: number | null;
  commentCount: number | null;
  title: string | null;
  field: string | null;
  shortPopularization: string | null;
  fallbackTitle: string;
  fallbackField: string;
  fallbackShortPopularization: string;
};

function toListItem(row: ArticleListRow): ArticleListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? row.fallbackTitle,
    field: row.field ?? row.fallbackField,
    fieldSlug: row.fieldSlug,
    shortPopularization:
      row.shortPopularization ?? row.fallbackShortPopularization,
    imageUrl: publicImageUrl(row.slug, row.imageUrl, Boolean(row.hasImage)),
    publishedAt: toIso(row.publishedAt),
    paperPublishedAt: toNullableIso(row.paperPublishedAt),
    featured: row.featured,
    recentViews: row.recentViews ?? 0,
    authors: row.authors,
    commentCount: row.commentCount ?? 0,
  };
}

function selectArticles(locale: Locale) {
  return db
    .select(articleListColumns)
    .from(articles)
    .innerJoin(polish, polishJoin())
    .leftJoin(requested, requestedJoin(locale))
    .leftJoin(recentViews, eq(recentViews.articleId, articles.id))
    .leftJoin(commentCounts, eq(commentCounts.articleId, articles.id));
}

function countArticles(locale: Locale) {
  return db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(articles)
    .innerJoin(polish, polishJoin())
    .leftJoin(requested, requestedJoin(locale))
    .leftJoin(recentViews, eq(recentViews.articleId, articles.id));
}

export async function listArticles(
  locale: Locale,
  options: ArticleQueryOptions = {},
): Promise<ArticleListItem[]> {
  const rows = await selectArticles(locale)
    .where(articleWhere(options))
    .orderBy(...articleOrder(options.sort));

  return rows.map(toListItem);
}

export async function listArticlePage(
  locale: Locale,
  options: ArticleQueryOptions & { page: number },
): Promise<ArticlePage> {
  const where = articleWhere(options);
  const pageSize = ARTICLE_PAGE_SIZE;
  const [countRows, rows] = await Promise.all([
    countArticles(locale).where(where),
    selectArticles(locale)
      .where(where)
      .orderBy(...articleOrder(options.sort))
      .limit(pageSize)
      .offset((options.page - 1) * pageSize),
  ]);

  return {
    articles: rows.map(toListItem),
    page: options.page,
    pageSize,
    total: Number(countRows[0]?.total ?? 0),
  };
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
      fieldSlug: articles.fieldSlug,
      authors: articles.authors,
      realTitle: articles.realTitle,
      imageUrl: articles.imageUrl,
      hasImage: isNotNull(articles.imageContentType),
      publishedAt: articles.publishedAt,
      paperPublishedAt: articles.paperPublishedAt,
      featured: articles.featured,
      commentCount: commentCounts.commentCount,
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
    .leftJoin(commentCounts, eq(commentCounts.articleId, articles.id))
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
    fieldSlug: row.fieldSlug,
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
    commentCount: row.commentCount ?? 0,
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
  page = 1,
): Promise<ArticleCategoryDetail | undefined> {
  const result = await listArticlePage(locale, {
    field: slug,
    sort: 'newest',
    page,
  });
  const field = result.articles[0]?.field;

  if (!field) {
    return undefined;
  }

  return { slug, field, ...result };
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
