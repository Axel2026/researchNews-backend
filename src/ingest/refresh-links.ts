import 'dotenv/config';
import { queryClient } from '../db/client';
import { listArticleRefs, updateArticleLinks } from '../articles/repository';
import { createCoreClient } from '../core/client';
import { normalizeDoi, originalPaperUrl, paperDownloadUrl } from '../core/map';

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

async function refresh(): Promise<void> {
  const client = createCoreClient({
    apiKey: requireCoreApiKey(),
    baseUrl: process.env.CORE_API_URL,
  });

  const rows = await listArticleRefs();
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const coreId = coreIdFromArticleId(row.id);
    if (!coreId) {
      skipped += 1;
      continue;
    }

    const raw = await client.getWork(coreId);
    if (!raw || typeof raw !== 'object') {
      skipped += 1;
      continue;
    }

    const work = raw as {
      doi?: unknown;
      links?: unknown;
      downloadUrl?: unknown;
    };
    const doi = normalizeDoi(work.doi);
    const sourceUrl = originalPaperUrl(doi, work.links, coreId);
    const downloadUrl = paperDownloadUrl(work);

    await updateArticleLinks(row.id, { sourceUrl, downloadUrl, doi });
    updated += 1;
  }

  console.log(`Refreshed paper links: ${updated} updated, ${skipped} skipped`);
}

refresh()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
