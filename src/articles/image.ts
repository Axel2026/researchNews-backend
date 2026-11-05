export const PLACEHOLDER_IMAGE = '/images/news-placeholder.svg';

export function articleImageUrl(options: {
  slug: string;
  hasStoredImage: boolean;
  storedUrl: string;
  publicBase: string;
}): string {
  if (options.hasStoredImage) {
    const base = options.publicBase.replace(/\/$/, '');
    return `${base}/articles/${encodeURIComponent(options.slug)}/image`;
  }

  if (!options.storedUrl || options.storedUrl.startsWith('/images/articles/')) {
    return PLACEHOLDER_IMAGE;
  }

  return options.storedUrl;
}
