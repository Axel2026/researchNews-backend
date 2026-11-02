import { describe, expect, it } from 'vitest';
import { sortArticlesForHome } from './sort';

describe('sortArticlesForHome', () => {
  it('puts featured first, then newest publishedAt', () => {
    const older = {
      slug: 'older',
      featured: false,
      publishedAt: new Date('2026-11-01T12:00:00.000Z'),
    };
    const newer = {
      slug: 'newer',
      featured: false,
      publishedAt: new Date('2026-11-02T12:00:00.000Z'),
    };
    const featured = {
      slug: 'featured',
      featured: true,
      publishedAt: new Date('2026-10-01T12:00:00.000Z'),
    };

    expect(
      sortArticlesForHome([older, featured, newer]).map((item) => item.slug),
    ).toEqual(['featured', 'newer', 'older']);
  });
});
