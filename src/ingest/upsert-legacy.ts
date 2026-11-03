import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryClient } from '../db/client';
import {
  upsertPopularizedPaper,
  type PopularizedArticle,
} from './upsert-papers';

const papersPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../tmp/legacy-popularized.json',
);

async function main() {
  const papers = JSON.parse(
    await readFile(papersPath, 'utf8'),
  ) as PopularizedArticle[];
  if (papers.length !== 23) {
    throw new Error(`Expected 23 legacy papers, got ${papers.length}`);
  }

  for (const paper of papers) {
    await upsertPopularizedPaper(paper);
  }

  console.log(`Upserted ${papers.length} unified legacy articles`);
  for (const paper of papers) {
    console.log(`- ${paper.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
