import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, queryClient } from './db/client';
import { articles, articleTranslations } from './db/schema';
import { FALLBACK_LOCALE } from './articles/locale';
import { papersSeedSchema } from './articles/validation';

const PLACEHOLDER_IMAGE = '/images/news-placeholder.svg';
const SEED_BASE = new Date('2026-11-03T12:00:00.000Z');

const papersPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend/src/data/prace-badawcze.json',
);

async function seed() {
  const raw = JSON.parse(await readFile(papersPath, 'utf8')) as unknown;
  const papers = papersSeedSchema.parse(raw);

  for (const [index, paper] of papers.entries()) {
    const publishedAt = new Date(SEED_BASE.getTime() - index * 86_400_000);

    await db
      .insert(articles)
      .values({
        id: paper.id,
        slug: paper.slug,
        authors: paper.authors,
        realTitle: paper.realTitle,
        imageUrl: PLACEHOLDER_IMAGE,
        featured: index === 0,
        publishedAt,
        doi: null,
        year: null,
        journal: null,
        sourceUrl: null,
      })
      .onConflictDoUpdate({
        target: articles.id,
        set: {
          slug: paper.slug,
          authors: paper.authors,
          realTitle: paper.realTitle,
          imageUrl: PLACEHOLDER_IMAGE,
          featured: index === 0,
          publishedAt,
        },
      });

    await db
      .insert(articleTranslations)
      .values({
        articleId: paper.id,
        locale: FALLBACK_LOCALE,
        title: paper.title,
        field: paper.field,
        shortPopularization: paper.shortPopularization,
        mediumPopularization: paper.mediumPopularization,
        fullPopularization: paper.fullPopularization,
      })
      .onConflictDoUpdate({
        target: [articleTranslations.articleId, articleTranslations.locale],
        set: {
          title: paper.title,
          field: paper.field,
          shortPopularization: paper.shortPopularization,
          mediumPopularization: paper.mediumPopularization,
          fullPopularization: paper.fullPopularization,
        },
      });
  }

  console.log(`Seeded ${papers.length} articles from ${papersPath}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
