import { describe, expect, it } from 'vitest';
import { fetchWorksForIngest } from './works';

const abstract = `${'Open-access research papers can be discovered through CORE search. '.repeat(4)}Done.`;

function work(id: number, extras: Record<string, unknown> = {}) {
  return {
    id,
    title: `A substantial research title number ${id}`,
    abstract,
    authors: [{ name: 'Ada Lovelace' }],
    doi: `10.1234/example.${id}`,
    yearPublished: 2024,
    publishedDate: '2024-06-01T00:00:00+00:00',
    publisher: 'PNAS',
    documentType: 'research article',
    ...extras,
  };
}

describe('fetchWorksForIngest', () => {
  it('collects 20 mapped works and skips duplicates and thin records', async () => {
    const pages = [
      [
        work(1),
        work(1),
        work(2, { doi: '10.1234/example.1' }),
        work(3, { abstract: 'short' }),
        work(4, { documentType: 'dataset' }),
        ...Array.from({ length: 10 }, (_, index) => work(10 + index)),
      ],
      Array.from({ length: 12 }, (_, index) => work(30 + index)),
    ];

    const client = {
      searchWorks: async () => pages.shift() ?? [],
    };

    const papers = await fetchWorksForIngest(client, 20);
    expect(papers).toHaveLength(20);
    expect(new Set(papers.map((paper) => paper.id)).size).toBe(20);
  });
});
