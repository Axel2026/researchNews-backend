import 'dotenv/config';
import { slugifyField } from '../articles/category';
import {
  listFallbackFields,
  setArticleFieldSlug,
} from '../articles/repository';
import { queryClient } from './client';

async function backfillFieldSlug(): Promise<void> {
  const rows = await listFallbackFields();

  for (const row of rows) {
    await setArticleFieldSlug(row.id, slugifyField(row.field));
  }

  console.log(`Backfilled field_slug for ${rows.length} articles`);
}

backfillFieldSlug()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
