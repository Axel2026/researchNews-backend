import { describe, expect, it } from 'vitest';
import {
  COMMENT_MAX_LENGTH,
  commentBodySchema,
  createCommentSchema,
} from './body';

describe('commentBodySchema', () => {
  it('trims and accepts a non-empty body', () => {
    expect(commentBodySchema.parse('  hello\nthere  ')).toBe('hello\nthere');
  });

  it('rejects empty or too-long bodies', () => {
    expect(commentBodySchema.safeParse('   ').success).toBe(false);
    expect(commentBodySchema.safeParse('').success).toBe(false);
    expect(
      commentBodySchema.safeParse('a'.repeat(COMMENT_MAX_LENGTH + 1)).success,
    ).toBe(false);
  });
});

describe('createCommentSchema', () => {
  it('accepts an optional parent id', () => {
    expect(
      createCommentSchema.parse({ body: 'hello', parentId: 'parent-1' }),
    ).toEqual({ body: 'hello', parentId: 'parent-1' });
    expect(createCommentSchema.parse({ body: 'hello' })).toEqual({
      body: 'hello',
    });
  });
});
