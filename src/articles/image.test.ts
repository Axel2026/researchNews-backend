import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_IMAGE, articleImageUrl } from './image';

describe('articleImageUrl', () => {
  it('serves stored images from the API', () => {
    expect(
      articleImageUrl({
        slug: 'frog-peptides',
        hasStoredImage: true,
        storedUrl: '/images/articles/frog-peptides.jpg',
        publicBase: 'http://localhost:4000/',
      }),
    ).toBe('http://localhost:4000/articles/frog-peptides/image');
  });

  it('falls back to the placeholder when a frontend path is all that remains', () => {
    expect(
      articleImageUrl({
        slug: 'frog-peptides',
        hasStoredImage: false,
        storedUrl: '/images/articles/frog-peptides.jpg',
        publicBase: 'http://localhost:4000',
      }),
    ).toBe(PLACEHOLDER_IMAGE);
  });

  it('keeps a remote URL when no image is stored', () => {
    expect(
      articleImageUrl({
        slug: 'frog-peptides',
        hasStoredImage: false,
        storedUrl: 'https://core.ac.uk/image/1/large',
        publicBase: 'http://localhost:4000',
      }),
    ).toBe('https://core.ac.uk/image/1/large');
  });
});
