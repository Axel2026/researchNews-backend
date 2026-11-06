import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { articles } from '../../db/schema';

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

  const bytes = Buffer.isBuffer(row.image) ? row.image : Buffer.from(row.image);

  return { bytes, contentType: row.contentType };
}

export async function storeArticleImage(
  slug: string,
  image: Buffer,
  contentType: string,
): Promise<boolean> {
  const result = await db
    .update(articles)
    .set({ image, imageContentType: contentType })
    .where(eq(articles.slug, slug))
    .returning({ id: articles.id });

  return result.length > 0;
}
