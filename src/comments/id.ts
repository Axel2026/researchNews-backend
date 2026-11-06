const COMMENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCommentId(
  raw: string,
): { ok: true; id: string } | { ok: false } {
  if (!COMMENT_ID.test(raw)) {
    return { ok: false };
  }

  return { ok: true, id: raw };
}
