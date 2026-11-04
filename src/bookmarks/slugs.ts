export function applyBookmark(
  slugs: string[],
  slug: string,
  bookmarked: boolean,
): string[] {
  const without = slugs.filter((item) => item !== slug);

  if (!bookmarked) {
    return without;
  }

  return [slug, ...without];
}
