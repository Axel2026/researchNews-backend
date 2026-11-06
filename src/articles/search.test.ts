import { describe, expect, it } from 'vitest';
import {
  ilikeContainsPattern,
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

  it('rejects unknown values', () => {
    expect(parseArticleSort('popular')).toEqual({ ok: false });
  });
});

describe('ilikeContainsPattern', () => {
  it('wraps the phrase for a contains match', () => {
    expect(ilikeContainsPattern('peptide')).toBe('%peptide%');
  });
});
