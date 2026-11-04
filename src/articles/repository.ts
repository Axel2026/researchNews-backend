import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/client';
import { articles, articleTranslations } from '../db/schema';
import { env } from '../env';
import {
  articlesForCategorySlug,
  slugifyField,
  uniqueCategories,
} from './category';
import { articleImageUrl } from './image';
import { FALLBACK_LOCALE, type Locale } from './locale';
import { resolveSourceUrl } from '../core/map';
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

export async function listArticles(locale: Locale): Promise<ArticleListItem[]> {
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      hasImage: isNotNull(articles.imageContentType),
      publishedAt: articles.publishedAt,
      paperPublishedAt: articles.paperPublishedAt,
      featured: articles.featured,
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
    .orderBy(desc(articles.featured), desc(articles.publishedAt));

  return rows.map((row) => ({
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
  }));
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
  const articles = articlesForCategorySlug(await listArticles(locale), slug);
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

  const bytes = Buffer.isBuffer(row.image)
    ? row.image
    : Buffer.from(row.image);

  return { bytes, contentType: row.contentType };
}
