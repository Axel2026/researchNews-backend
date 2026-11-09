import { eq, sql } from 'drizzle-orm';
import { displayNameFromEmail } from '../comments/display-name';
import { db } from '../db/client';
import { users } from '../db/schema';

export async function ensureUser(userId: string): Promise<void> {
  await db
    .insert(users)
    .values({ id: userId, bookmarkedSlugs: [] })
    .onConflictDoNothing();
}

export async function rememberDisplayName(
  userId: string,
  email: string | null,
): Promise<string> {
  const fallback = displayNameFromEmail(email);
  await ensureUser(userId);
  await db
    .update(users)
    .set({
      displayName: sql`coalesce(${users.displayName}, ${fallback})`,
    })
    .where(eq(users.id, userId));

  const rows = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0]?.displayName ?? fallback;
}
