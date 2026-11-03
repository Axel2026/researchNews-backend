import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, queryClient } from '../db/client';
import { articles } from '../db/schema';
import { createCoreClient } from '../core/client';
import { mapWork, type MappedWork } from '../core/map';

const TARGET = 20;
const PAGE_SIZE = 25;
const MAX_OFFSET = 200;

const QUERIES = [
  '(publisher:Nature) AND (yearPublished:2024 OR yearPublished:2023) AND _exists_:doi',
  '(publisher:Science) AND (yearPublished:2024 OR yearPublished:2023 OR yearPublished:2022) AND _exists_:doi',
  '(publisher:Cell) AND (yearPublished:2024 OR yearPublished:2023 OR yearPublished:2022) AND _exists_:doi',
  '(publisher:Lancet) AND (yearPublished:2024 OR yearPublished:2023 OR yearPublished:2022) AND _exists_:doi',
  '(publisher:PNAS OR publisher:"National Academy") AND yearPublished:2021 AND _exists_:doi',
];

const SKIP_TITLE =
  /publisher correction|erratum|retraction|author correction|comment on /i;
const JUNK_FIELD =
  /info:eu-repo|semantics\/|peer[- ]reviewed|journal article|publication\s*-\s*article|^text$|^article$|conferenceobject|randomized controlled trial|published erratum/i;

function requireCoreApiKey(): string {
  const value = process.env.CORE_API_KEY;
  if (!value) {
    throw new Error('Missing CORE_API_KEY');
  }
  return value;
}

function isComplete(paper: MappedWork): boolean {
  if (SKIP_TITLE.test(paper.realTitle)) {
    return false;
  }

  if (paper.fullPopularization.length < 500) {
    return false;
  }

  return Boolean(
    paper.doi &&
    paper.year &&
    paper.journal &&
    paper.sourceUrl &&
    paper.authors.length > 0,
  );
}

async function main() {
  const existing = await db
    .select({
      id: articles.id,
      doi: articles.doi,
    })
    .from(articles);

  const seenIds = new Set(existing.map((row) => row.id));
  const seenDois = new Set(
    existing.map((row) => row.doi).filter((doi): doi is string => Boolean(doi)),
  );

  const client = createCoreClient({
    apiKey: requireCoreApiKey(),
    baseUrl: process.env.CORE_API_URL,
  });

  const papers: MappedWork[] = [];

  for (const q of QUERIES) {
    if (papers.length >= TARGET) {
      break;
    }

    for (
      let offset = 0;
      offset <= MAX_OFFSET && papers.length < TARGET;
      offset += PAGE_SIZE
    ) {
      const results = await client.searchWorks({
        q,
        limit: PAGE_SIZE,
        offset,
        sort: 'relevance',
      });
      if (results.length === 0) {
        break;
      }

      for (const result of results) {
        const paper = mapWork(result);
        if (!paper || !isComplete(paper)) {
          continue;
        }
        if (seenIds.has(paper.id) || (paper.doi && seenDois.has(paper.doi))) {
          continue;
        }

        seenIds.add(paper.id);
        if (paper.doi) {
          seenDois.add(paper.doi);
        }
        papers.push(paper);
        if (papers.length >= TARGET) {
          break;
        }
      }
    }
  }

  const outPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../tmp/extra-core.json',
  );
  const serializable = papers.map((paper) => ({
    ...paper,
    field: JUNK_FIELD.test(paper.field) ? '' : paper.field,
    publishedAt: paper.publishedAt.toISOString(),
    abstractChars: paper.fullPopularization.length,
  }));
  await writeFile(outPath, JSON.stringify(serializable, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        found: papers.length,
        outPath,
        summary: serializable.map((paper) => ({
          id: paper.id,
          journal: paper.journal,
          year: paper.year,
          field: paper.field,
          doi: paper.doi,
          title: paper.realTitle,
          abstractChars: paper.abstractChars,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
