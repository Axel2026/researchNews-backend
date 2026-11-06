import { z } from 'zod';

export const bookmarkUpdateSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  bookmarked: z.boolean(),
});
