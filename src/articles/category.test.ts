import { describe, expect, it } from 'vitest';
import {
  articlesForCategorySlug,
  isFieldOfStudy,
  slugifyField,
  uniqueCategories,
} from './category';

describe('slugifyField', () => {
  it('slugifies a Polish field name', () => {
    expect(slugifyField('Biochemia i mikrobiologia')).toBe(
      'biochemia-i-mikrobiologia',
    );
  });

  it('maps ł and ß', () => {
    expect(slugifyField('Etologia zwierząt gospodarskich')).toBe(
      'etologia-zwierzat-gospodarskich',
    );
    expect(slugifyField('Straße')).toBe('strasse');
  });
});

describe('articlesForCategorySlug', () => {
  const articles = [
    { slug: 'one', field: 'Biochemia i mikrobiologia' },
    { slug: 'two', field: 'PNAS' },
    { slug: 'three', field: 'PNAS' },
  ];

  it('returns articles whose field matches the slug', () => {
    expect(
      articlesForCategorySlug(articles, 'pnas').map((item) => item.slug),
    ).toEqual(['two', 'three']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(articlesForCategorySlug(articles, 'missing')).toEqual([]);
  });
});

describe('isFieldOfStudy', () => {
  it('keeps CORE-style fields of study', () => {
    expect(isFieldOfStudy('Microbiology')).toBe(true);
    expect(isFieldOfStudy('Biochemia i mikrobiologia')).toBe(true);
    expect(isFieldOfStudy('Computer Science')).toBe(true);
  });

  it('drops journals, publishers, and document types', () => {
    expect(isFieldOfStudy('PNAS')).toBe(false);
    expect(isFieldOfStudy('journal article')).toBe(false);
    expect(isFieldOfStudy('Artigo')).toBe(false);
    expect(isFieldOfStudy('artículo')).toBe(false);
    expect(isFieldOfStudy('Nature')).toBe(false);
  });
});

describe('uniqueCategories', () => {
  it('keeps CORE fields of study and sorts them', () => {
    expect(
      uniqueCategories([
        { field: 'Microbiology' },
        { field: 'PNAS' },
        { field: 'Biochemia i mikrobiologia' },
        { field: 'journal article' },
        { field: 'Microbiology' },
      ]),
    ).toEqual([
      { slug: 'biochemia-i-mikrobiologia', field: 'Biochemia i mikrobiologia' },
      { slug: 'microbiology', field: 'Microbiology' },
    ]);
  });

  it('groups locales by the canonical field slug', () => {
    expect(
      uniqueCategories([
        {
          field: 'Biochemistry and microbiology',
          fieldSlug: 'biochemia-i-mikrobiologia',
        },
        {
          field: 'Biochemia i mikrobiologia',
          fieldSlug: 'biochemia-i-mikrobiologia',
        },
      ]),
    ).toEqual([
      {
        slug: 'biochemia-i-mikrobiologia',
        field: 'Biochemistry and microbiology',
      },
    ]);
  });
});
