import { describe, expect, it } from 'vitest';
import { popularizeBodySchema, saveAiKeySchema } from './body';

describe('saveAiKeySchema', () => {
  it('accepts a provider and a key', () => {
    const parsed = saveAiKeySchema.safeParse({
      provider: 'openai',
      model: 'gpt-6.1-sol',
      apiKey: 'sk-live-key-with-enough-length',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects a short key and an unknown provider', () => {
    expect(
      saveAiKeySchema.safeParse({
        provider: 'openai',
        model: 'gpt-6.1-sol',
        apiKey: 'short',
      }).success,
    ).toBe(false);
    expect(
      saveAiKeySchema.safeParse({
        provider: 'local',
        model: 'gpt-6.1-sol',
        apiKey: 'sk-live-key-with-enough-length',
      }).success,
    ).toBe(false);
    expect(
      saveAiKeySchema.safeParse({
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'sk-live-key-with-enough-length',
      }).success,
    ).toBe(false);
  });
});

describe('popularizeBodySchema', () => {
  it('accepts only the provider', () => {
    expect(popularizeBodySchema.safeParse({ provider: 'xai' }).success).toBe(
      true,
    );
  });

  it('rejects a client-supplied popularization', () => {
    const parsed = popularizeBodySchema.safeParse({
      provider: 'openai',
      apiKey: 'sk-live-key-with-enough-length',
      translations: { pl: { title: 'nope' } },
    });

    expect(parsed.success).toBe(false);
  });
});
