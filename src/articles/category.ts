const EXCLUDED_FIELDS = new Set([
  'dataset',
  'book',
  'book part',
  'thesis',
  'report',
  'presentation',
  'journal article',
  'research article',
  'article',
  'artigo',
  'artículo',
  'preprint',
  'research',
  'nature',
  'science',
  'cell',
  'lancet',
  'pnas',
]);

export function isFieldOfStudy(field: string): boolean {
  const trimmed = field.trim();
  if (trimmed.length < 3) {
    return false;
  }

  if (/^[A-Z]{2,6}$/.test(trimmed)) {
    return false;
  }

  return !EXCLUDED_FIELDS.has(trimmed.toLowerCase());
}

export function slugifyField(field: string): string {
  const slug = field
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/gi, 'l')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'category';
}

export function articlesForCategorySlug<T extends { field: string }>(
  articles: T[],
  slug: string,
): T[] {
  return articles.filter((article) => slugifyField(article.field) === slug);
}

export function uniqueCategories<T extends { field: string }>(
  articles: T[],
): { slug: string; field: string }[] {
  const seen = new Map<string, string>();

  for (const article of articles) {
    if (!isFieldOfStudy(article.field)) {
      continue;
    }

    const slug = slugifyField(article.field);
    if (!seen.has(slug)) {
      seen.set(slug, article.field);
    }
  }

  return [...seen]
    .map(([slug, field]) => ({ slug, field }))
    .sort((a, b) =>
      a.field.localeCompare(b.field, undefined, { sensitivity: 'base' }),
    );
}
