import { and, eq, isNull } from 'drizzle-orm';
import { slugifyField } from '../articles/category';
import { db } from '../db/client';
import { articleTranslations, articles } from '../db/schema';
import type { PopularizationDraft } from './prompt';

const CLAIM_MS = 3 * 60 * 1000;

export type StubArticle = {
  id: string;
  realTitle: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string;
};

export type ClaimResult =
  | { status: 'claimed'; article: StubArticle }
  | { status: 'not_found' }
  | { status: 'already_popularized' }
  | { status: 'in_progress' }
  | { status: 'missing_abstract' };

export async function claimStub(
  slug: string,
  userId: string,
): Promise<ClaimResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: articles.id,
        realTitle: articles.realTitle,
        authors: articles.authors,
        year: articles.year,
        journal: articles.journal,
        doi: articles.doi,
        abstract: articles.abstract,
        popularizedAt: articles.popularizedAt,
        popularizingAt: articles.popularizingAt,
      })
      .from(articles)
      .where(eq(articles.slug, slug))
      .for('update')
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { status: 'not_found' };
    }

    if (row.popularizedAt) {
      return { status: 'already_popularized' };
    }

    if (
      row.popularizingAt &&
      Date.now() - row.popularizingAt.getTime() < CLAIM_MS
    ) {
      return { status: 'in_progress' };
    }

    const abstract = row.abstract?.trim() ?? '';
    if (!abstract) {
      return { status: 'missing_abstract' };
    }

    await tx
      .update(articles)
      .set({ popularizingAt: new Date(), popularizingBy: userId })
      .where(eq(articles.id, row.id));

    return {
      status: 'claimed',
      article: {
        id: row.id,
        realTitle: row.realTitle,
        authors: row.authors,
        year: row.year,
        journal: row.journal,
        doi: row.doi,
        abstract,
      },
    };
  });
}

export async function releaseClaim(
  articleId: string,
  userId: string,
): Promise<void> {
  await db
    .update(articles)
    .set({ popularizingAt: null, popularizingBy: null })
    .where(
      and(
        eq(articles.id, articleId),
        eq(articles.popularizingBy, userId),
        isNull(articles.popularizedAt),
      ),
    );
}

export async function savePopularization({
  articleId,
  userId,
  model,
  draft,
}: {
  articleId: string;
  userId: string;
  model: string;
  draft: PopularizationDraft;
}): Promise<'saved' | 'lost'> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(articles)
      .set({
        popularizedAt: new Date(),
        popularizedBy: userId,
        popularizingAt: null,
        popularizingBy: null,
        popularizationModel: model,
        fieldSlug: slugifyField(draft.pl.field),
      })
      .where(
        and(
          eq(articles.id, articleId),
          isNull(articles.popularizedAt),
          eq(articles.popularizingBy, userId),
        ),
      )
      .returning({ id: articles.id });

    if (updated.length === 0) {
      return 'lost';
    }

    for (const locale of ['pl', 'en'] as const) {
      const translation = draft[locale];
      await tx
        .insert(articleTranslations)
        .values({
          articleId,
          locale,
          ...translation,
        })
        .onConflictDoUpdate({
          target: [articleTranslations.articleId, articleTranslations.locale],
          set: translation,
        });
    }

    return 'saved';
  });
}
