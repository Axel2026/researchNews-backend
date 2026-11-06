const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseSlug(
  raw: string,
): { ok: true; slug: string } | { ok: false } {
  if (!SLUG.test(raw)) {
    return { ok: false };
  }

  return { ok: true, slug: raw };
}
