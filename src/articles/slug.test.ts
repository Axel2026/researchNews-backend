import { describe, expect, it } from 'vitest';
import { parseSlug } from './slug';

describe('parseSlug', () => {
  it('accepts a kebab-case slug', () => {
    expect(parseSlug('frog-peptides')).toEqual({
      ok: true,
      slug: 'frog-peptides',
    });
  });

  it('rejects blanks and other shapes', () => {
    expect(parseSlug('')).toEqual({ ok: false });
    expect(parseSlug('Frog')).toEqual({ ok: false });
    expect(parseSlug('frog_peptides')).toEqual({ ok: false });
    expect(parseSlug('-frog')).toEqual({ ok: false });
  });
});
