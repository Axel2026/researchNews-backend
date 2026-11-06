import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { articles, comments, users } from '../db/schema';
import { isWithinEditWindow } from './edit-window';
import { isValidParent } from './parent';
import {
  assembleThread,
  toCreatedComment,
  type CommentReply,
  type CommentThread,
  type ThreadRow,
} from './thread';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export type CommentsList = {
  comments: CommentThread[];
  truncated: boolean;
};

async function articleIdBySlug(slug: string): Promise<string | null> {
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  return rows[0]?.id ?? null;
}

async function upsertAuthor(userId: string, displayName: string) {
  await db
    .insert(users)
    .values({
      id: userId,
      bookmarkedSlugs: [],
      displayName,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { displayName },
    });
}

async function recentCommentCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(comments.userId, userId), gt(comments.createdAt, since)));

  return rows[0]?.count ?? 0;
}

function toThreadRow(
  row: Omit<ThreadRow, 'displayName'> & { displayName?: string | null },
): ThreadRow {
  return {
    ...row,
    displayName: row.displayName ?? null,
  };
}

export async function listComments(
  slug: string,
): Promise<CommentsList | 'not_found'> {
  const articleId = await articleIdBySlug(slug);
  if (!articleId) {
    return 'not_found';
  }

  const rows = await db
    .select({
      id: comments.id,
      articleId: comments.articleId,
      userId: comments.userId,
      parentId: comments.parentId,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      deletedAt: comments.deletedAt,
      displayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.articleId, articleId));

  return assembleThread(rows);
}

export async function createComment(input: {
  slug: string;
  userId: string;
  displayName: string;
  body: string;
  parentId?: string;
}): Promise<
  CommentReply | CommentThread | 'not_found' | 'invalid_parent' | 'rate_limited'
> {
  const articleId = await articleIdBySlug(input.slug);
  if (!articleId) {
    return 'not_found';
  }

  if ((await recentCommentCount(input.userId)) >= RATE_LIMIT) {
    return 'rate_limited';
  }

  if (input.parentId) {
    const parents = await db
      .select({
        articleId: comments.articleId,
        parentId: comments.parentId,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .where(eq(comments.id, input.parentId))
      .limit(1);

    if (!isValidParent(parents[0], articleId)) {
      return 'invalid_parent';
    }
  }

  await upsertAuthor(input.userId, input.displayName);

  const now = new Date();
  const id = crypto.randomUUID();
  const parentId = input.parentId ?? null;

  await db.insert(comments).values({
    id,
    articleId,
    userId: input.userId,
    parentId,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  });

  return toCreatedComment(
    toThreadRow({
      id,
      articleId,
      userId: input.userId,
      parentId,
      body: input.body,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      displayName: input.displayName,
    }),
    parentId,
  );
}

export async function updateComment(input: {
  id: string;
  userId: string;
  body: string;
}): Promise<CommentReply | 'not_found' | 'forbidden' | 'edit_expired'> {
  const rows = await db
    .select({
      id: comments.id,
      articleId: comments.articleId,
      userId: comments.userId,
      parentId: comments.parentId,
      body: comments.body,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      deletedAt: comments.deletedAt,
      displayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.id, input.id))
    .limit(1);

  const existing = rows[0];
  if (!existing || existing.deletedAt) {
    return 'not_found';
  }

  if (existing.userId !== input.userId) {
    return 'forbidden';
  }

  if (!isWithinEditWindow(existing.createdAt)) {
    return 'edit_expired';
  }

  const now = new Date();

  await db
    .update(comments)
    .set({ body: input.body, updatedAt: now })
    .where(eq(comments.id, input.id));

  return toCreatedComment(
    toThreadRow({ ...existing, body: input.body, updatedAt: now }),
    existing.parentId,
  );
}

export async function deleteComment(input: {
  id: string;
  userId: string;
}): Promise<{ id: string; deleted: true } | 'not_found' | 'forbidden'> {
  const rows = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(eq(comments.id, input.id))
    .limit(1);

  const existing = rows[0];
  if (!existing) {
    return 'not_found';
  }

  if (existing.userId !== input.userId) {
    return 'forbidden';
  }

  if (!existing.deletedAt) {
    await db
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(eq(comments.id, input.id));
  }

  return { id: existing.id, deleted: true };
}
