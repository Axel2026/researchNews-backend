import { describe, expect, it } from 'vitest';
import { mapWork, paperPublicationFromWork, parseYear, slugify } from './map';

const abstract = `${'The study shows how open research data can be reused across labs. '.repeat(4)}Final sentence.`;

const work = {
  id: 168327997,
  title:
    'Cyanobacteria and Chloroflexota cooperate to structure light-responsive biofilms',
  abstract,
  authors: [{ name: 'Alice Example' }, { name: 'Bob Example' }],
  doi: 'https://doi.org/10.1073/pnas.2423574122',
  yearPublished: 2024,
  publishedDate: '2024-03-12T00:00:00+00:00',
  publisher: 'PNAS',
  journals: [{ title: 'Proceedings of the National Academy of Sciences' }],
  fieldOfStudy: 'Microbiology',
  documentType: 'research article',
  downloadUrl: 'https://core.ac.uk/download/639105039.pdf',
  links: [
    { type: 'display', url: 'https://core.ac.uk/works/168327997' },
    { type: 'download', url: 'https://core.ac.uk/download/639105039.pdf' },
    { type: 'thumbnail_l', url: 'https://core.ac.uk/image/168327997/large' },
  ],
};

describe('mapWork', () => {
  it('maps a CORE work into an article record', () => {
    const paper = mapWork(work);

    expect(paper).toMatchObject({
      id: 'core-168327997',
      slug: 'cyanobacteria-and-chloroflexota-cooperate-to-structure-light-responsive-168327997',
      authors: ['Alice Example', 'Bob Example'],
      realTitle: work.title,
      title: work.title,
      field: 'Microbiology',
      doi: '10.1073/pnas.2423574122',
      year: 2024,
      journal: 'Proceedings of the National Academy of Sciences',
      sourceUrl: 'https://doi.org/10.1073/pnas.2423574122',
      downloadUrl: 'https://core.ac.uk/download/639105039.pdf',
      imageUrl: 'https://core.ac.uk/image/168327997/large',
      paperPublishedAt: new Date('2024-03-12T00:00:00.000Z'),
    });
    expect(paper?.shortPopularization.length).toBeGreaterThan(0);
    expect(paper?.fullPopularization).toBe(
      abstract.replace(/\s+/g, ' ').trim(),
    );
  });

  it('maps Nature portfolio journals from the DOI when CORE omits the title', () => {
    const paper = mapWork({
      ...work,
      journals: [{ title: null }],
      publisher: 'Nature',
      doi: '10.1038/s41598-024-52300-3',
    });

    expect(paper?.journal).toBe('Scientific Reports');
  });

  it('skips works without a usable abstract or authors', () => {
    expect(mapWork({ ...work, abstract: 'Too short' })).toBeNull();
    expect(mapWork({ ...work, authors: [] })).toBeNull();
    expect(mapWork({ ...work, documentType: 'dataset' })).toBeNull();
    expect(mapWork({ ...work, fieldOfStudy: 'Dataset' })).toBeNull();
  });

  it('accepts author names as strings', () => {
    const paper = mapWork({ ...work, authors: ['Jane Roe'] });
    expect(paper?.authors).toEqual(['Jane Roe']);
  });

  it('uses CORE fieldOfStudy and does not fall back to the journal', () => {
    const paper = mapWork({ ...work, fieldOfStudy: undefined });
    expect(paper?.field).toBe('Research');
    expect(paper?.journal).toBe(
      'Proceedings of the National Academy of Sciences',
    );
  });

  it('falls back to the CORE display page when there is no DOI', () => {
    const paper = mapWork({ ...work, doi: undefined });
    expect(paper?.sourceUrl).toBe('https://core.ac.uk/works/168327997');
  });

  it('uses yearPublished when CORE has no publishedDate', () => {
    const paper = mapWork({ ...work, publishedDate: undefined });
    expect(paper?.paperPublishedAt).toEqual(new Date(Date.UTC(2024, 0, 1)));
  });

  it('omits downloadUrl when CORE has no PDF', () => {
    const paper = mapWork({
      ...work,
      downloadUrl: '',
      links: [
        { type: 'display', url: 'https://core.ac.uk/works/168327997' },
        {
          type: 'thumbnail_l',
          url: 'https://core.ac.uk/image/168327997/large',
        },
      ],
    });
    expect(paper?.downloadUrl).toBeNull();
  });
});

describe('paperPublicationFromWork', () => {
  it('reads publishedDate from a CORE work', () => {
    expect(paperPublicationFromWork(work)).toEqual({
      paperPublishedAt: new Date('2024-03-12T00:00:00.000Z'),
      year: 2024,
    });
  });

  it('falls back to yearPublished', () => {
    expect(
      paperPublicationFromWork({
        yearPublished: 2021,
        publishedDate: undefined,
      }),
    ).toEqual({
      paperPublishedAt: new Date(Date.UTC(2021, 0, 1)),
      year: 2021,
    });
  });

  it('returns null when CORE has no publication date', () => {
    expect(paperPublicationFromWork({})).toBeNull();
  });
});

describe('parseYear', () => {
  it('accepts a four-digit year and YYYYMMDD integers', () => {
    expect(parseYear(2024)).toBe(2024);
    expect(parseYear(20190903)).toBe(2019);
    expect(parseYear(20212)).toBeNull();
    expect(parseYear(10000)).toBeNull();
  });
});

describe('slugify', () => {
  it('builds a lowercase hyphenated slug', () => {
    expect(slugify('Hello, CORE API!')).toBe('hello-core-api');
  });
});
