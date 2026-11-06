import 'dotenv/config';
import { queryClient } from '../db/client';
import { createCoreClient } from '../core/client';
import { CORE_INGEST_LIMIT, fetchWorksForIngest } from '../core/works';
import { slugifyField } from '../articles/category';
import { FALLBACK_LOCALE } from '../articles/locale';
import { upsertArticle } from '../articles/repository';
import type { MappedWork } from '../core/map';

function requireCoreApiKey(): string {
  const value = process.env.CORE_API_KEY;
  if (!value) {
    throw new Error('Missing CORE_API_KEY');
  }
  return value;
}

async function upsertPaper(paper: MappedWork): Promise<void> {
  const values = {
    id: paper.id,
    slug: paper.slug,
    authors: paper.authors,
    realTitle: paper.realTitle,
    imageUrl: paper.imageUrl,
    featured: false,
    publishedAt: paper.publishedAt,
    paperPublishedAt: paper.paperPublishedAt,
    doi: paper.doi,
    year: paper.year,
    journal: paper.journal,
    sourceUrl: paper.sourceUrl,
    downloadUrl: paper.downloadUrl,
    fieldSlug: slugifyField(paper.field),
  };

  await upsertArticle(
    values,
    {
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
    ['en', FALLBACK_LOCALE].map((locale) => ({
      articleId: paper.id,
      locale,
      title: paper.title,
      field: paper.field,
      shortPopularization: paper.shortPopularization,
      mediumPopularization: paper.mediumPopularization,
      fullPopularization: paper.fullPopularization,
    })),
  );
}

async function ingest(): Promise<void> {
  const client = createCoreClient({
    apiKey: requireCoreApiKey(),
    baseUrl: process.env.CORE_API_URL,
  });
  const papers = await fetchWorksForIngest(client, CORE_INGEST_LIMIT);

  if (papers.length < CORE_INGEST_LIMIT) {
    throw new Error(
      `CORE ingest expected ${CORE_INGEST_LIMIT} works, received ${papers.length}`,
    );
  }

  for (const paper of papers) {
    await upsertPaper(paper);
  }

  console.log(`Ingested ${papers.length} CORE works:`);
  for (const paper of papers) {
    console.log(`- ${paper.slug}`);
  }
}

ingest()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
