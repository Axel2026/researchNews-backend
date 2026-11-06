import { db } from '../db/client';
import { articles, articleTranslations } from '../db/schema';
import { isFieldOfStudy, slugifyField } from '../articles/category';
import { uniqueAuthors } from './authors';

export type Translation = {
  title: string;
  field: string;
  shortPopularization: string;
  mediumPopularization: string;
  fullPopularization: string;
};

export type PopularizedArticle = {
  id: string;
  slug: string;
  authors: string[];
  realTitle: string;
  imageUrl: string;
  featured?: boolean;
  publishedAt: string;
  paperPublishedAt?: string | null;
  doi: string | null;
  year: number | null;
  journal: string | null;
  sourceUrl: string | null;
  downloadUrl?: string | null;
  translations: Record<'pl' | 'en', Translation>;
};

export async function upsertPopularizedPaper(
  paper: PopularizedArticle,
): Promise<void> {
  const authors = uniqueAuthors(paper.authors);
  if (authors.length === 0) {
    throw new Error(`No authors for ${paper.id}`);
  }

  for (const locale of ['pl', 'en'] as const) {
    if (!isFieldOfStudy(paper.translations[locale].field)) {
      throw new Error(
        `Missing field of study (category) for ${paper.id} (${locale})`,
      );
    }
  }

  const publishedAt = new Date(paper.publishedAt);
  const paperPublishedAt = paper.paperPublishedAt
    ? new Date(paper.paperPublishedAt)
    : publishedAt;
  const articleValues = {
    slug: paper.slug,
    authors,
    realTitle: paper.realTitle,
    imageUrl: paper.imageUrl,
    publishedAt,
    paperPublishedAt,
    doi: paper.doi,
    year: paper.year,
    journal: paper.journal,
    sourceUrl: paper.sourceUrl,
    downloadUrl: paper.downloadUrl ?? null,
    fieldSlug: slugifyField(paper.translations.pl.field),
  };

  await db
    .insert(articles)
    .values({
      id: paper.id,
      featured: paper.featured ?? false,
      ...articleValues,
    })
    .onConflictDoUpdate({
      target: articles.id,
      set:
        paper.featured === undefined
          ? articleValues
          : { ...articleValues, featured: paper.featured },
    });

  for (const locale of ['pl', 'en'] as const) {
    const translation = paper.translations[locale];
    await db
      .insert(articleTranslations)
      .values({
        articleId: paper.id,
        locale,
        title: translation.title,
        field: translation.field,
        shortPopularization: translation.shortPopularization,
        mediumPopularization: translation.mediumPopularization,
        fullPopularization: translation.fullPopularization,
      })
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
