import { describe, expect, it } from 'vitest';
import { mapSourceRow } from './map';

const core = {
  id: 'core',
  name: 'CORE API',
  url: 'https://core.ac.uk/',
  fallbackSummary: 'Polish summary',
};

describe('mapSourceRow', () => {
  it('uses the requested summary when it exists', () => {
    expect(mapSourceRow({ ...core, summary: 'English summary' }).summary).toBe(
      'English summary',
    );
  });

  it('falls back to Polish when the requested summary is missing', () => {
    expect(mapSourceRow({ ...core, summary: null }).summary).toBe(
      'Polish summary',
    );
  });
});
