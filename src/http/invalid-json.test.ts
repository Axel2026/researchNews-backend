import { describe, expect, it } from 'vitest';
import { isInvalidJson } from './invalid-json';

describe('isInvalidJson', () => {
  it('accepts a body-parser JSON syntax error', () => {
    const error = new SyntaxError('Unexpected token');
    Object.assign(error, { type: 'entity.parse.failed', status: 400 });

    expect(isInvalidJson(error)).toBe(true);
  });

  it('rejects other failures', () => {
    expect(isInvalidJson(new SyntaxError('nope'))).toBe(false);
    expect(isInvalidJson(new Error('entity.parse.failed'))).toBe(false);
  });
});
