import { describe, expect, it } from 'vitest';
import { isValidParent } from './parent';

const parent = {
  articleId: 'article-1',
  parentId: null as string | null,
  deletedAt: null as Date | null,
};

describe('isValidParent', () => {
  it('accepts a live top-level comment on the same article', () => {
    expect(isValidParent(parent, 'article-1')).toBe(true);
  });

  it('rejects missing, nested, deleted, or mismatched parents', () => {
    expect(isValidParent(null, 'article-1')).toBe(false);
    expect(isValidParent({ ...parent, articleId: 'other' }, 'article-1')).toBe(
      false,
    );
    expect(isValidParent({ ...parent, parentId: 'top' }, 'article-1')).toBe(
      false,
    );
    expect(
      isValidParent({ ...parent, deletedAt: new Date() }, 'article-1'),
    ).toBe(false);
  });
});
