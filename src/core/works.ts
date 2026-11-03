import type { CoreClient } from './client';
import { mapWork, type MappedWork } from './map';

export const CORE_INGEST_LIMIT = 20;

const PAGE_SIZE = 25;
const MAX_OFFSET = 100;

const POPULAR_QUERY =
  '(publisher:Nature OR publisher:Science OR publisher:Cell OR publisher:Lancet OR publisher:PNAS) AND (yearPublished:2024 OR yearPublished:2023 OR yearPublished:2022)';
const FALLBACK_QUERY = '_exists_:doi AND yearPublished:2024';

export async function fetchWorksForIngest(
  client: CoreClient,
  limit = CORE_INGEST_LIMIT,
): Promise<MappedWork[]> {
  const collected = await collect(
    client,
    POPULAR_QUERY,
    'relevance',
    limit,
    [],
  );

  if (collected.length >= limit) {
    return collected;
  }

  return collect(client, FALLBACK_QUERY, 'recency', limit, collected);
}

async function collect(
  client: CoreClient,
  q: string,
  sort: string,
  limit: number,
  existing: MappedWork[],
): Promise<MappedWork[]> {
  const papers = [...existing];
  const seenIds = new Set(papers.map((paper) => paper.id));
  const seenDois = new Set(
    papers
      .map((paper) => paper.doi)
      .filter((doi): doi is string => Boolean(doi)),
  );

  for (
    let offset = 0;
    offset <= MAX_OFFSET && papers.length < limit;
    offset += PAGE_SIZE
  ) {
    const results = await client.searchWorks({
      q,
      limit: PAGE_SIZE,
      offset,
      sort,
    });

    if (results.length === 0) {
      break;
    }

    for (const result of results) {
      const paper = mapWork(result);
      if (!paper || seenIds.has(paper.id)) {
        continue;
      }

      if (paper.doi && seenDois.has(paper.doi)) {
        continue;
      }

      seenIds.add(paper.id);
      if (paper.doi) {
        seenDois.add(paper.doi);
      }

      papers.push(paper);
      if (papers.length >= limit) {
        break;
      }
    }
  }

  return papers;
}
