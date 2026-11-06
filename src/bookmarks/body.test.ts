import { describe, expect, it } from 'vitest';
import { bookmarkUpdateSchema } from './body';

describe('bookmarkUpdateSchema', () => {
  it('accepts a slug and a boolean', () => {
    expect(
      bookmarkUpdateSchema.parse({ slug: ' frog ', bookmarked: true }),
    ).toEqual({ slug: 'frog', bookmarked: true });
  });

  it('rejects an empty slug', () => {
    expect(
      bookmarkUpdateSchema.safeParse({ slug: '  ', bookmarked: false }).success,
    ).toBe(false);
  });
});
