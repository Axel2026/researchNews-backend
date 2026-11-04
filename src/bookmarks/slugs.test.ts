import { describe, expect, it } from 'vitest';
import { applyBookmark } from './slugs';

describe('applyBookmark', () => {
  it('prepends a new slug and moves an existing one to the front', () => {
    expect(applyBookmark(['a', 'b'], 'c', true)).toEqual(['c', 'a', 'b']);
    expect(applyBookmark(['a', 'b', 'c'], 'b', true)).toEqual(['b', 'a', 'c']);
  });

  it('removes a slug and ignores unknown slugs', () => {
    expect(applyBookmark(['a', 'b'], 'a', false)).toEqual(['b']);
    expect(applyBookmark(['a'], 'missing', false)).toEqual(['a']);
  });
});
