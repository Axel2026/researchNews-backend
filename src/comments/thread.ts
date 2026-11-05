export const TOP_LEVEL_LIMIT = 100;

export type CommentAuthor = {
  id: string;
  displayName: string;
};

export type CommentReply = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  author: CommentAuthor;
};

export type CommentThread = CommentReply & {
  replies: CommentReply[];
};

export type ThreadRow = {
  id: string;
  articleId: string;
  userId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  displayName: string | null;
};

function toReply(row: ThreadRow): CommentReply {
  const deleted = Boolean(row.deletedAt);

  return {
    id: row.id,
    body: deleted ? '' : row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deleted,
    author: {
      id: row.userId,
      displayName: row.displayName?.trim() || 'user',
    },
  };
}

export function assembleThread(rows: ThreadRow[]): {
  comments: CommentThread[];
  truncated: boolean;
} {
  const repliesByParent = new Map<string, ThreadRow[]>();
  const tops: ThreadRow[] = [];

  for (const row of rows) {
    if (row.parentId) {
      const list = repliesByParent.get(row.parentId) ?? [];
      list.push(row);
      repliesByParent.set(row.parentId, list);
      continue;
    }

    tops.push(row);
  }

  const visible = tops
    .map((top) => {
      const replies = (repliesByParent.get(top.id) ?? [])
        .filter((reply) => !reply.deletedAt)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(toReply);

      if (top.deletedAt && replies.length === 0) {
        return null;
      }

      return {
        ...toReply(top),
        replies,
      };
    })
    .filter((comment): comment is CommentThread => comment !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return {
    comments: visible.slice(0, TOP_LEVEL_LIMIT),
    truncated: visible.length > TOP_LEVEL_LIMIT,
  };
}

export function toCreatedComment(
  row: ThreadRow,
  parentId: string | null,
): CommentReply | CommentThread {
  const comment = toReply(row);

  if (parentId) {
    return comment;
  }

  return { ...comment, replies: [] };
}
