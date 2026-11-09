import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryClient } from './db/client';
import { PLACEHOLDER_IMAGE } from './articles/image';
import { slugifyField } from './articles/category';
import { FALLBACK_LOCALE } from './articles/locale';
import { upsertArticle } from './articles/repository';
import { papersSeedSchema } from './articles/validation';

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

    const paperPublishedAt = paper.paperPublishedAt
      ? new Date(paper.paperPublishedAt)
      : null;
    const values = {
      id: paper.id,
      slug: paper.slug,
      authors: paper.authors,
      realTitle: paper.realTitle,
      imageUrl: PLACEHOLDER_IMAGE,
      featured: index === 0,
      publishedAt,
      paperPublishedAt,
      doi: null,
      year: paper.year ?? null,
      journal: null,
      sourceUrl: null,
      downloadUrl: null,
      fieldSlug: slugifyField(paper.field),
      popularizedAt: publishedAt,
    };

    await upsertArticle(
      values,
      {
        slug: values.slug,
        authors: values.authors,
        realTitle: values.realTitle,
        imageUrl: values.imageUrl,
        featured: values.featured,
        publishedAt: values.publishedAt,
        paperPublishedAt: values.paperPublishedAt,
        year: values.year,
        fieldSlug: values.fieldSlug,
        popularizedAt: values.popularizedAt,
      },
      [
        {
          articleId: paper.id,
          locale: FALLBACK_LOCALE,
          title: paper.title,
          field: paper.field,
          shortPopularization: paper.shortPopularization,
          mediumPopularization: paper.mediumPopularization,
          fullPopularization: paper.fullPopularization,
        },
      ],
    );
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
