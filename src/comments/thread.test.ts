import { describe, expect, it } from 'vitest';
import { assembleThread, TOP_LEVEL_LIMIT } from './thread';
import type { ThreadRow } from './thread';

function row(overrides: Partial<ThreadRow> & Pick<ThreadRow, 'id'>): ThreadRow {
  return {
    articleId: 'article-1',
    userId: 'user-1',
    parentId: null,
    body: `body-${overrides.id}`,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    displayName: 'anna',
    ...overrides,
  };
}

describe('assembleThread', () => {
  it('nests one level, newest tops first and oldest replies first', () => {
    const result = assembleThread([
      row({
        id: 'older-top',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      row({
        id: 'newer-top',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
      row({
        id: 'later-reply',
        parentId: 'older-top',
        createdAt: new Date('2026-01-01T02:00:00.000Z'),
      }),
      row({
        id: 'earlier-reply',
        parentId: 'older-top',
        createdAt: new Date('2026-01-01T01:00:00.000Z'),
      }),
    ]);

    expect(result.truncated).toBe(false);
    expect(result.comments.map((comment) => comment.id)).toEqual([
      'newer-top',
      'older-top',
    ]);
    expect(result.comments[1]?.replies.map((reply) => reply.id)).toEqual([
      'earlier-reply',
      'later-reply',
    ]);
  });

  it('hides deleted replies and deleted tops without replies', () => {
    const result = assembleThread([
      row({ id: 'gone', deletedAt: new Date('2026-01-03T00:00:00.000Z') }),
      row({
        id: 'kept',
        deletedAt: new Date('2026-01-03T00:00:00.000Z'),
        body: 'secret',
      }),
      row({ id: 'visible-reply', parentId: 'kept' }),
      row({
        id: 'hidden-reply',
        parentId: 'kept',
        deletedAt: new Date('2026-01-03T00:00:00.000Z'),
      }),
    ]);

    expect(result.comments.map((comment) => comment.id)).toEqual(['kept']);
    expect(result.comments[0]?.body).toBe('');
    expect(result.comments[0]?.deleted).toBe(true);
    expect(result.comments[0]?.replies.map((reply) => reply.id)).toEqual([
      'visible-reply',
    ]);
  });

  it('marks the list truncated after 100 top-level comments', () => {
    const rows = Array.from({ length: TOP_LEVEL_LIMIT + 1 }, (_, index) =>
      row({
        id: `top-${index}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
      }),
    );

    const result = assembleThread(rows);

    expect(result.comments).toHaveLength(TOP_LEVEL_LIMIT);
    expect(result.truncated).toBe(true);
    expect(result.comments[0]?.id).toBe(`top-${TOP_LEVEL_LIMIT}`);
  });
});
