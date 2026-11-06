import { describe, expect, it } from 'vitest';
import { COMMENT_EDIT_WINDOW_MS, isWithinEditWindow } from './edit-window';

const createdAt = new Date('2026-11-06T10:00:00.000Z');

describe('isWithinEditWindow', () => {
  it('allows edits in the first hour after posting', () => {
    expect(isWithinEditWindow(createdAt, createdAt)).toBe(true);
    expect(
      isWithinEditWindow(
        createdAt,
        new Date(createdAt.getTime() + COMMENT_EDIT_WINDOW_MS - 1),
      ),
    ).toBe(true);
  });

  it('rejects edits once the first hour has passed', () => {
    expect(
      isWithinEditWindow(
        createdAt,
        new Date(createdAt.getTime() + COMMENT_EDIT_WINDOW_MS),
      ),
    ).toBe(false);
  });
});
