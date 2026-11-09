import { hasAiKey, openAiKey } from '../ai-keys/repository';
import type { AiProvider } from '../ai-keys/providers';
import { rememberDisplayName } from '../users/repository';
import { requestPopularization } from './complete';
import { parsePopularization } from './draft';
import { popularizationPrompt } from './prompt';
import { claimStub, releaseClaim, savePopularization } from './repository';

export type PopularizeResult =
  | 'saved'
  | 'not_found'
  | 'already_popularized'
  | 'in_progress'
  | 'missing_abstract'
  | 'missing_key'
  | 'invalid_key'
  | 'invalid_generation'
  | 'provider_error';

function wipe(secret: Buffer | null): void {
  secret?.fill(0);
}

export async function popularizeArticle({
  slug,
  userId,
  email,
  provider,
}: {
  slug: string;
  userId: string;
  email: string | null;
  provider: AiProvider;
}): Promise<PopularizeResult> {
  if (!(await hasAiKey(userId, provider))) {
    return 'missing_key';
  }

  const claim = await claimStub(slug, userId);
  if (claim.status !== 'claimed') {
    return claim.status;
  }

  let secret: Buffer | null = null;
  let model = '';
  let saved = false;

  try {
    try {
      const opened = await openAiKey(userId, provider);
      secret = opened?.secret ?? null;
      model = opened?.model ?? '';
    } catch {
      return 'invalid_key';
    }

    if (!secret || !model) {
      return 'missing_key';
    }

    const prompt = popularizationPrompt({
      realTitle: claim.article.realTitle,
      authors: claim.article.authors,
      year: claim.article.year,
      journal: claim.article.journal,
      doi: claim.article.doi,
      abstract: claim.article.abstract,
    });
    const completion = await requestPopularization({
      provider,
      model,
      apiKey: secret.toString('utf8'),
      system: prompt.system,
      user: prompt.user,
    });

    if (!completion.ok) {
      return completion.error;
    }

    const draft = parsePopularization(
      completion.value,
      claim.article.abstract,
      claim.article.realTitle,
    );
    if (!draft) {
      return 'invalid_generation';
    }

    await rememberDisplayName(userId, email);
    const written = await savePopularization({
      articleId: claim.article.id,
      userId,
      model,
      draft,
    });

    if (written === 'lost') {
      return 'already_popularized';
    }

    saved = true;
    return 'saved';
  } finally {
    wipe(secret);
    if (!saved) {
      await releaseClaim(claim.article.id, userId);
    }
  }
}
