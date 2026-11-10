import { describe, expect, it } from 'vitest';
import { queryParam } from './query';

describe('queryParam', () => {
  it('reads a string and the first repeated value', () => {
    expect(queryParam({ locale: 'pl' }, 'locale')).toBe('pl');
    expect(queryParam({ locale: ['en', 'pl'] }, 'locale')).toBe('en');
  });

  it('returns undefined when the parameter is missing or not a string', () => {
    expect(queryParam({}, 'locale')).toBeUndefined();
    expect(queryParam({ locale: 1 }, 'locale')).toBeUndefined();
  });
});
