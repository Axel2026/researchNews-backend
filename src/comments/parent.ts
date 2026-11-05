export type ParentComment = {
  articleId: string;
  parentId: string | null;
  deletedAt: Date | null;
};

export function isValidParent(
  parent: ParentComment | null | undefined,
  articleId: string,
): parent is ParentComment {
  return (
    parent != null &&
    parent.articleId === articleId &&
    parent.parentId === null &&
    parent.deletedAt === null
  );
}
