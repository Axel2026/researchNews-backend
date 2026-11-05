function publicationTime(item: {
  publishedAt: Date | string;
  paperPublishedAt?: Date | string | null;
}): number {
  const value = item.paperPublishedAt ?? item.publishedAt;
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export function sortArticlesByPublicationDate<
  T extends {
    publishedAt: Date | string;
    paperPublishedAt?: Date | string | null;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => publicationTime(b) - publicationTime(a));
}

export function sortArticlesForHome<
  T extends {
    featured: boolean;
    publishedAt: Date;
    paperPublishedAt?: Date | null;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }

    return publicationTime(b) - publicationTime(a);
  });
}
