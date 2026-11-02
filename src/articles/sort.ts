export function sortArticlesForHome<
  T extends { featured: boolean; publishedAt: Date },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }

    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
}
