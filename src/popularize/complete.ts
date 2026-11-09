import type { AiProvider } from '../ai-keys/providers';
import { providerEndpoint } from '../ai-keys/providers';

const MAX_OUTPUT_CHARS = 100_000;
const MAX_TOKENS = 8000;

export type ProviderRequest = {
  url: string;
  init: RequestInit;
};

export function buildProviderRequest({
  provider,
  model,
  apiKey,
  system,
  user,
}: {
  provider: AiProvider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
}): ProviderRequest {
  const url = providerEndpoint(provider);

  if (provider === 'anthropic') {
    return {
      url,
      init: {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      },
    };
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: MAX_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  if (provider !== 'openai') {
    body.temperature = 0.4;
  }

  return {
    url,
    init: {
      method: 'POST',
      redirect: 'error',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
  };
}

export function parseModelJson(text: string): unknown | null {
  const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1]?.trim() ?? text.trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');

  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(source.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function messageText(payload: unknown, provider: AiProvider): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (provider === 'anthropic') {
    const content = record.content;
    if (!Array.isArray(content)) {
      return null;
    }

    const block = content.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item as { type?: string }).type === 'text' &&
        typeof (item as { text?: string }).text === 'string',
    ) as { text: string } | undefined;

    return block?.text ?? null;
  }

  const choices = record.choices;
  if (
    !Array.isArray(choices) ||
    !choices[0] ||
    typeof choices[0] !== 'object'
  ) {
    return null;
  }

  const message = (choices[0] as { message?: { content?: unknown } }).message;
  return typeof message?.content === 'string' ? message.content : null;
}

export type Completion =
  | { ok: true; value: unknown }
  | { ok: false; error: 'provider_error' | 'invalid_generation' };

export async function requestPopularization({
  provider,
  model,
  apiKey,
  system,
  user,
  fetchImpl = fetch,
}: {
  provider: AiProvider;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  fetchImpl?: typeof fetch;
}): Promise<Completion> {
  const request = buildProviderRequest({
    provider,
    model,
    apiKey,
    system,
    user,
  });
  let response: Response;

  try {
    response = await fetchImpl(request.url, {
      ...request.init,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    return { ok: false, error: 'provider_error' };
  }

  if (!response.ok) {
    return { ok: false, error: 'provider_error' };
  }

  const raw = await response.text();
  if (raw.length > MAX_OUTPUT_CHARS) {
    return { ok: false, error: 'invalid_generation' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: 'invalid_generation' };
  }

  const text = messageText(payload, provider);
  if (!text || text.length > MAX_OUTPUT_CHARS) {
    return { ok: false, error: 'invalid_generation' };
  }

  const value = parseModelJson(text);
  if (!value) {
    return { ok: false, error: 'invalid_generation' };
  }

  return { ok: true, value };
}
