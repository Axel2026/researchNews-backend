import { describe, expect, it } from 'vitest';
import { parseCommentId } from './id';

describe('parseCommentId', () => {
  it('accepts a uuid', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(parseCommentId(id)).toEqual({ ok: true, id });
  });

  it('rejects other ids', () => {
    expect(parseCommentId('')).toEqual({ ok: false });
    expect(parseCommentId('older-top')).toEqual({ ok: false });
    expect(parseCommentId('550e8400-e29b-41d4-a716')).toEqual({ ok: false });
  });
});
