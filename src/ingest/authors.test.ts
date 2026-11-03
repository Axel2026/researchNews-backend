import { describe, expect, it } from 'vitest';
import { uniqueAuthors } from './authors';

describe('uniqueAuthors', () => {
  it('drops ORCID suffixes and duplicate name forms', () => {
    expect(
      uniqueAuthors([
        'Künzler, Markus; id_orcid',
        'Markus Künzler',
        'et al.',
        'Beusch, Irene; https://orcid.org/',
        'Irene Beusch',
      ]),
    ).toEqual(['Markus Künzler', 'Irene Beusch']);
  });
});
