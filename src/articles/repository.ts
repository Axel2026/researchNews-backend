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
  users,
} from '../db/schema';
import { RECENT_VIEW_DAYS } from './views';
import { env } from '../env';
import { articleImageUrl } from './image';
import { FALLBACK_LOCALE, type Locale } from './locale';
import { resolveSourceUrl } from '../core/map';
import {
  ARTICLE_PAGE_SIZE,
  ilikeContainsPattern,
  type ArticleListSort,
} from './search';
import type { ArticleDetail, ArticleListItem, ArticlePage } from './types';

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
      popularizedAt: articles.popularizedAt,
      popularizedBy: articles.popularizedBy,
      popularizationModel: articles.popularizationModel,
      popularizerName: users.displayName,
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
    .leftJoin(users, eq(users.id, articles.popularizedBy))
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
    needsPopularization: row.popularizedAt === null,
    popularizationModel: row.popularizationModel,
    communityPopularization: row.popularizedBy
      ? { displayName: row.popularizerName ?? 'user' }
      : null,
  };
}

type ArticleWrite = {
  id: string;
  slug: string;
  authors: string[];
  realTitle: string;
  imageUrl: string;
  featured: boolean;
  publishedAt: Date;
  paperPublishedAt: Date | null;
  doi: string | null;
  year: number | null;
  journal: string | null;
  sourceUrl: string | null;
  downloadUrl: string | null;
  fieldSlug: string;
  abstract?: string | null;
  popularizedAt?: Date | null;
};

type TranslationWrite = {
  articleId: string;
  locale: string;
  title: string;
  field: string;
  shortPopularization: string;
  mediumPopularization: string;
  fullPopularization: string;
};

function definedColumns<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).filter((entry) => entry[1] !== undefined),
  ) as T;
}

export async function upsertArticle(
  values: ArticleWrite,
  set: Partial<Omit<ArticleWrite, 'id'>>,
  translations: TranslationWrite[],
): Promise<void> {
  await db
    .insert(articles)
    .values(definedColumns(values))
    .onConflictDoUpdate({
      target: articles.id,
      set: definedColumns(set),
    });

  for (const translation of translations) {
    await db
      .insert(articleTranslations)
      .values(translation)
      .onConflictDoUpdate({
        target: [articleTranslations.articleId, articleTranslations.locale],
        set: {
          title: translation.title,
          field: translation.field,
          shortPopularization: translation.shortPopularization,
          mediumPopularization: translation.mediumPopularization,
          fullPopularization: translation.fullPopularization,
        },
      });
  }
}

export async function upsertCoreStub(
  values: ArticleWrite & { abstract: string },
  translations: TranslationWrite[],
): Promise<void> {
  await db
    .insert(articles)
    .values({ ...values, popularizedAt: null })
    .onConflictDoUpdate({
      target: articles.id,
      set: {
        slug: values.slug,
        authors: values.authors,
        realTitle: values.realTitle,
        imageUrl: values.imageUrl,
        publishedAt: values.publishedAt,
        paperPublishedAt: values.paperPublishedAt,
        doi: values.doi,
        year: values.year,
        journal: values.journal,
        sourceUrl: values.sourceUrl,
        downloadUrl: values.downloadUrl,
        fieldSlug: values.fieldSlug,
      },
    });

  const stillStub = await db
    .update(articles)
    .set({ abstract: values.abstract })
    .where(and(eq(articles.id, values.id), isNull(articles.popularizedAt)))
    .returning({ id: articles.id });

  if (stillStub.length === 0) {
    return;
  }

  for (const translation of translations) {
    await db
      .insert(articleTranslations)
      .values(translation)
      .onConflictDoUpdate({
        target: [articleTranslations.articleId, articleTranslations.locale],
        set: {
          title: translation.title,
          field: translation.field,
          shortPopularization: translation.shortPopularization,
          mediumPopularization: translation.mediumPopularization,
          fullPopularization: translation.fullPopularization,
        },
      });
  }
}

export async function listArticleRefs(): Promise<
  { id: string; doi: string | null; realTitle: string }[]
> {
  return db
    .select({
      id: articles.id,
      doi: articles.doi,
      realTitle: articles.realTitle,
    })
    .from(articles);
}

export async function updateArticlePublication(
  id: string,
  publication: { paperPublishedAt: Date; year: number | null },
): Promise<void> {
  await db.update(articles).set(publication).where(eq(articles.id, id));
}

export async function updateArticleLinks(
  id: string,
  links: {
    sourceUrl: string | null;
    downloadUrl: string | null;
    doi: string | null;
  },
): Promise<void> {
  await db
    .update(articles)
    .set({
      sourceUrl: links.sourceUrl,
      downloadUrl: links.downloadUrl,
      ...(links.doi ? { doi: links.doi } : {}),
    })
    .where(eq(articles.id, id));
}

export async function listFallbackFields(): Promise<
  { id: string; field: string }[]
> {
  return db
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
}

export async function setArticleFieldSlug(
  id: string,
  fieldSlug: string,
): Promise<void> {
  await db.update(articles).set({ fieldSlug }).where(eq(articles.id, id));
}
