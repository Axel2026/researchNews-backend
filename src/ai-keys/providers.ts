export const AI_PROVIDERS = ['openai', 'xai', 'anthropic'] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

const MODELS: Record<AiProvider, readonly string[]> = {
  openai: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6-luna'],
  xai: ['grok-4.7', 'grok-4.3', 'grok-4.20-0309-non-reasoning'],
  anthropic: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'],
};

export function modelsFor(provider: AiProvider): readonly string[] {
  return MODELS[provider];
}

export function defaultModel(provider: AiProvider): string {
  return MODELS[provider][0];
}

export function isProviderModel(provider: AiProvider, model: string): boolean {
  return MODELS[provider].includes(model);
}

const ENDPOINTS: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function providerEndpoint(provider: AiProvider): string {
  return ENDPOINTS[provider];
}
