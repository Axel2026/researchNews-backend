import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { db, queryClient } from '../db/client';
import { articles } from '../db/schema';

const IMAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../frontend/public/images/articles',
);

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function upload(): Promise<void> {
  const names = await readdir(IMAGE_DIR);
  let updated = 0;
  let skipped = 0;

  for (const name of names) {
    const extension = path.extname(name).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      skipped += 1;
      continue;
    }

    const slug = path.basename(name, extension);
    const bytes = await readFile(path.join(IMAGE_DIR, name));
    const result = await db
      .update(articles)
      .set({
        image: bytes,
        imageContentType: contentType,
      })
      .where(eq(articles.slug, slug))
      .returning({ id: articles.id });

    if (result.length === 0) {
      console.warn(`No article for ${name}`);
      skipped += 1;
      continue;
    }

    updated += 1;
  }

  console.log(`Uploaded article images: ${updated} stored, ${skipped} skipped`);
}

upload()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
