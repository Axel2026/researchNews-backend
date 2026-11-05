import { z } from 'zod';

export const COMMENT_MAX_LENGTH = 2000;

export const commentBodySchema = z
  .string()
  .trim()
  .min(1)
  .max(COMMENT_MAX_LENGTH);

export const createCommentSchema = z.object({
  body: commentBodySchema,
  parentId: z.string().trim().min(1).max(80).optional(),
});

export const updateCommentSchema = z.object({
  body: commentBodySchema,
});
