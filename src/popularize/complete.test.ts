import { describe, expect, it } from 'vitest';
import {
  buildProviderRequest,
  parseModelJson,
  requestPopularization,
} from './complete';

describe('buildProviderRequest', () => {
  it('calls only the official endpoint and refuses redirects', () => {
    const openai = buildProviderRequest({
      provider: 'openai',
      model: 'gpt-6.1-sol',
      apiKey: 'sk-test-key-value-1234',
      system: 'rules',
      user: 'paper',
    });
    const anthropic = buildProviderRequest({
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      apiKey: 'sk-ant-test-key-123456',
      system: 'rules',
      user: 'paper',
    });

    expect(openai.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(openai.init.redirect).toBe('error');
    const openaiBody = JSON.parse(String(openai.init.body)) as {
      model: string;
      temperature?: number;
    };
    expect(openaiBody.model).toBe('gpt-6.1-sol');
    expect(openaiBody.temperature).toBeUndefined();
    expect(anthropic.url).toBe('https://api.anthropic.com/v1/messages');
    expect(anthropic.init.redirect).toBe('error');
    expect(
      (anthropic.init.headers as Record<string, string>)['x-api-key'],
    ).toBe('sk-ant-test-key-123456');
  });
});

describe('parseModelJson', () => {
  it('reads a JSON object and a fenced block', () => {
    expect(parseModelJson('{"pl":{"title":"A"}}')).toMatchObject({
      pl: { title: 'A' },
    });
    expect(parseModelJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
});

describe('requestPopularization', () => {
  it('returns provider_error when the official host rejects the call', async () => {
    const result = await requestPopularization({
      provider: 'xai',
      model: 'grok-4.7',
      apiKey: 'xai-test-key-value-1234',
      system: 'rules',
      user: 'paper',
      fetchImpl: async (url, init) => {
        expect(url).toBe('https://api.x.ai/v1/chat/completions');
        expect(init?.redirect).toBe('error');
        return new Response('no', { status: 401 });
      },
    });

    expect(result).toEqual({ ok: false, error: 'provider_error' });
  });

  it('returns the parsed article when the provider replies with JSON', async () => {
    const result = await requestPopularization({
      provider: 'openai',
      model: 'gpt-6-luna',
      apiKey: 'sk-test-key-value-1234',
      system: 'rules',
      user: 'paper',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"pl":{"title":"A"}}' } }],
          }),
          { status: 200 },
        ),
    });

    expect(result).toEqual({ ok: true, value: { pl: { title: 'A' } } });
  });
});
