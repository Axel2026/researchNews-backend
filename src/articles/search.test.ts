import { describe, expect, it } from 'vitest';
import {
  articleDateBounds,
  ilikeContainsPattern,
  parseArticleDate,
  parseArticleField,
  parseArticlePage,
  parseArticleQuery,
  parseArticleSort,
} from './search';

describe('parseArticleQuery', () => {
  it('treats missing and blank values as no filter', () => {
    expect(parseArticleQuery(undefined)).toEqual({
      ok: true,
      query: undefined,
    });
    expect(parseArticleQuery('')).toEqual({ ok: true, query: undefined });
    expect(parseArticleQuery('   ')).toEqual({ ok: true, query: undefined });
  });

  it('trims the phrase', () => {
    expect(parseArticleQuery('  peptide  ')).toEqual({
      ok: true,
      query: 'peptide',
    });
  });

  it('normalises an author fragment the same way', () => {
    expect(parseArticleQuery('  Smith% ')).toEqual({
      ok: true,
      query: 'Smith',
    });
  });

  it('strips ILIKE wildcards', () => {
    expect(parseArticleQuery('100%_\\')).toEqual({
      ok: true,
      query: '100',
    });
    expect(parseArticleQuery('%_%\\')).toEqual({
      ok: true,
      query: undefined,
    });
  });

  it('rejects phrases longer than 200 characters', () => {
    expect(parseArticleQuery('a'.repeat(201))).toEqual({ ok: false });
    expect(parseArticleQuery('a'.repeat(200))).toEqual({
      ok: true,
      query: 'a'.repeat(200),
    });
  });
});

describe('parseArticleSort', () => {
  it('defaults when sort is missing', () => {
    expect(parseArticleSort(undefined)).toEqual({ ok: true, sort: 'default' });
    expect(parseArticleSort('')).toEqual({ ok: true, sort: 'default' });
  });

  it('accepts newest', () => {
    expect(parseArticleSort('newest')).toEqual({ ok: true, sort: 'newest' });
  });

  it('accepts popular', () => {
    expect(parseArticleSort('popular')).toEqual({ ok: true, sort: 'popular' });
  });

  it('rejects unknown values', () => {
    expect(parseArticleSort('featured')).toEqual({ ok: false });
  });
});

describe('parseArticleDate', () => {
  it('treats missing and blank values as no bound', () => {
    expect(parseArticleDate(undefined)).toEqual({
      ok: true,
      date: undefined,
    });
    expect(parseArticleDate('')).toEqual({ ok: true, date: undefined });
  });

  it('parses an ISO calendar date', () => {
    const parsed = parseArticleDate('2020-01-01');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.date) {
      return;
    }

    expect(parsed.date.year).toBe(2020);
    expect(parsed.date.month).toBe(1);
    expect(parsed.date.day).toBe(1);
  });

  it('rejects invalid calendar dates', () => {
    expect(parseArticleDate('2020-02-31')).toEqual({ ok: false });
    expect(parseArticleDate('01-01-2020')).toEqual({ ok: false });
  });
});

describe('articleDateBounds', () => {
  it('rejects a start after the end', () => {
    expect(
      articleDateBounds(
        Temporal.PlainDate.from('2021-01-01'),
        Temporal.PlainDate.from('2020-01-01'),
      ),
    ).toEqual({ ok: false });
  });

  it('includes the whole end day', () => {
    expect(
      articleDateBounds(
        Temporal.PlainDate.from('2020-01-01'),
        Temporal.PlainDate.from('2020-01-01'),
      ),
    ).toEqual({
      ok: true,
      start: new Date('2020-01-01T00:00:00.000Z'),
      endExclusive: new Date('2020-01-02T00:00:00.000Z'),
    });
  });
});

describe('parseArticleField', () => {
  it('accepts a category slug', () => {
    expect(parseArticleField('biochemia-i-mikrobiologia')).toEqual({
      ok: true,
      field: 'biochemia-i-mikrobiologia',
    });
  });

  it('treats a blank value as no filter', () => {
    expect(parseArticleField('')).toEqual({ ok: true, field: undefined });
  });

  it('rejects labels and path fragments', () => {
    expect(parseArticleField('../x')).toEqual({ ok: false });
    expect(parseArticleField('Biochemistry')).toEqual({ ok: false });
  });
});

describe('parseArticlePage', () => {
  it('treats a missing value as an unpaginated list', () => {
    expect(parseArticlePage(undefined)).toEqual({
      ok: true,
      page: undefined,
    });
  });

  it('accepts a positive integer without leading zeros', () => {
    expect(parseArticlePage('1')).toEqual({ ok: true, page: 1 });
    expect(parseArticlePage('2')).toEqual({ ok: true, page: 2 });
  });

  it('rejects blank, zero, fractions and padded numbers', () => {
    expect(parseArticlePage('')).toEqual({ ok: false });
    expect(parseArticlePage('0')).toEqual({ ok: false });
    expect(parseArticlePage('-1')).toEqual({ ok: false });
    expect(parseArticlePage('1.5')).toEqual({ ok: false });
    expect(parseArticlePage('01')).toEqual({ ok: false });
    expect(parseArticlePage('2abc')).toEqual({ ok: false });
  });
});

describe('ilikeContainsPattern', () => {
  it('wraps the phrase for a contains match', () => {
    expect(ilikeContainsPattern('peptide')).toBe('%peptide%');
  });
});
