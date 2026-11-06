export const MAX_ARTICLE_QUERY_LENGTH = 200;

export type ArticleListSort = 'default' | 'newest';

export function parseArticleQuery(
  raw: string | undefined,
): { ok: true; query: string | undefined } | { ok: false } {
  if (raw === undefined) {
    return { ok: true, query: undefined };
  }

  const trimmed = raw.trim();

  if (trimmed.length > MAX_ARTICLE_QUERY_LENGTH) {
    return { ok: false };
  }

  if (trimmed === '') {
    return { ok: true, query: undefined };
  }

  const query = trimmed.replace(/[%_\\]/g, '');

  return { ok: true, query: query === '' ? undefined : query };
}

export function parseArticleSort(
  raw: string | undefined,
): { ok: true; sort: ArticleListSort } | { ok: false } {
  if (raw === undefined || raw === '') {
    return { ok: true, sort: 'default' };
  }

  if (raw === 'newest') {
    return { ok: true, sort: 'newest' };
  }

  return { ok: false };
}

export function ilikeContainsPattern(query: string): string {
  return `%${query}%`;
}
