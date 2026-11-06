import 'dotenv/config';
import { queryClient } from '../db/client';
import {
  listArticleRefs,
  updateArticlePublication,
} from '../articles/repository';
import { createCoreClient, type CoreClient } from '../core/client';
import {
  normalizeDoi,
  paperPublicationFromWork,
  type PaperPublication,
} from '../core/map';

function requireCoreApiKey(): string {
  const value = process.env.CORE_API_KEY;
  if (!value) {
    throw new Error('Missing CORE_API_KEY');
  }
  return value;
}

function coreIdFromArticleId(id: string): string | null {
  return id.startsWith('core-') ? id.slice('core-'.length) : null;
}

function quoteTerm(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

async function fetchCoreWork(
  client: CoreClient,
  row: { id: string; doi: string | null; realTitle: string },
): Promise<unknown | null> {
  const coreId = coreIdFromArticleId(row.id);
  if (coreId) {
    return client.getWork(coreId);
  }

  const doi = normalizeDoi(row.doi);
  if (doi) {
    const byDoi = await client.searchWorks({
      q: `doi:${quoteTerm(doi)}`,
      limit: 1,
    });
    if (byDoi[0]) {
      return byDoi[0];
    }
  }

  const title = row.realTitle
    .replaceAll(/[:()]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  if (!title) {
    return null;
  }

  const byTitle = await client.searchWorks({
    q: `title:${quoteTerm(title)}`,
    limit: 1,
  });
  return byTitle[0] ?? null;
}

async function publicationForArticle(
  client: CoreClient,
  row: { id: string; doi: string | null; realTitle: string },
): Promise<PaperPublication | null> {
  try {
    const raw = await fetchCoreWork(client, row);
    return paperPublicationFromWork(raw);
  } catch (error) {
    throw new Error(`Failed to read CORE publication for ${row.id}`, {
      cause: error,
    });
  }
}

async function refresh(): Promise<void> {
  const client = createCoreClient({
    apiKey: requireCoreApiKey(),
    baseUrl: process.env.CORE_API_URL,
  });

  const rows = await listArticleRefs();

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const publication = await publicationForArticle(client, row);
    if (!publication) {
      skipped += 1;
      continue;
    }

    await updateArticlePublication(row.id, {
      paperPublishedAt: publication.paperPublishedAt,
      year: publication.year,
    });
    updated += 1;
    console.log(
      `- ${row.id} ${publication.paperPublishedAt.toISOString()} year=${publication.year ?? 'none'}`,
    );
  }

  console.log(
    `Refreshed paper dates from CORE: ${updated} updated, ${skipped} skipped`,
  );
}

refresh()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
