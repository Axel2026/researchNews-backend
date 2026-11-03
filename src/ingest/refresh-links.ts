import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, queryClient } from '../db/client';
import { articles } from '../db/schema';
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

  const rows = await db.select({ id: articles.id }).from(articles);
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

    await db
      .update(articles)
      .set({
        sourceUrl,
        downloadUrl,
        ...(doi ? { doi } : {}),
      })
      .where(eq(articles.id, row.id));
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
