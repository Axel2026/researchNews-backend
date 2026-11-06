export const MAX_ARTICLE_QUERY_LENGTH = 200;
export const ARTICLE_PAGE_SIZE = 12;

const PAGE_NUMBER = /^[1-9][0-9]*$/;

export type ArticleListSort = 'default' | 'newest' | 'popular';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIELD_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  if (raw === 'popular') {
    return { ok: true, sort: 'popular' };
  }

  return { ok: false };
}

export function parseArticleDate(
  raw: string | undefined,
): { ok: true; date: Temporal.PlainDate | undefined } | { ok: false } {
  if (raw === undefined || raw.trim() === '') {
    return { ok: true, date: undefined };
  }

  if (!ISO_DATE.test(raw)) {
    return { ok: false };
  }

  try {
    return { ok: true, date: Temporal.PlainDate.from(raw) };
  } catch {
    return { ok: false };
  }
}

export function articleDateBounds(
  from: Temporal.PlainDate | undefined,
  to: Temporal.PlainDate | undefined,
): { ok: false } | { ok: true; start?: Date; endExclusive?: Date } {
  if (from && to && Temporal.PlainDate.compare(from, to) > 0) {
    return { ok: false };
  }

  return {
    ok: true,
    start: from
      ? new Date(from.toZonedDateTime('UTC').toInstant().epochMilliseconds)
      : undefined,
    endExclusive: to
      ? new Date(
          to.add({ days: 1 }).toZonedDateTime('UTC').toInstant()
            .epochMilliseconds,
        )
      : undefined,
  };
}

export function parseArticleField(
  raw: string | undefined,
): { ok: true; field: string | undefined } | { ok: false } {
  if (raw === undefined || raw.trim() === '') {
    return { ok: true, field: undefined };
  }

  if (!FIELD_SLUG.test(raw)) {
    return { ok: false };
  }

  return { ok: true, field: raw };
}

export function parseArticlePage(
  raw: string | undefined,
): { ok: true; page: number | undefined } | { ok: false } {
  if (raw === undefined) {
    return { ok: true, page: undefined };
  }

  if (!PAGE_NUMBER.test(raw)) {
    return { ok: false };
  }

  return { ok: true, page: Number(raw) };
}

export function ilikeContainsPattern(query: string): string {
  return `%${query}%`;
}
