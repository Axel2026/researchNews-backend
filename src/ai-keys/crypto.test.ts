import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptApiKey, encryptApiKey, rewrapDek } from './crypto';

const kek = randomBytes(32);
const apiKey = 'sk-test-key-value-1234';

function roundTrip(userId: string, provider: string) {
  const encrypted = encryptApiKey({ apiKey, userId, provider, kek });
  const opened = decryptApiKey({ encrypted, userId, provider, kek });
  try {
    return opened.toString('utf8');
  } finally {
    opened.fill(0);
  }
}

describe('encryptApiKey', () => {
  it('round-trips the key and keeps only the last four characters in the clear', () => {
    const encrypted = encryptApiKey({
      apiKey,
      userId: 'user-1',
      provider: 'openai',
      kek,
    });

    expect(encrypted.last4).toBe('1234');
    expect(encrypted.kekVersion).toBe(1);
    expect(encrypted.nonce).toHaveLength(12);
    expect(encrypted.wrapNonce).toHaveLength(12);
    expect(encrypted.tag).toHaveLength(16);
    expect(encrypted.ciphertext.equals(Buffer.from(apiKey))).toBe(false);
    expect(roundTrip('user-1', 'openai')).toBe(apiKey);
  });

  it('uses a fresh nonce for each save', () => {
    const first = encryptApiKey({
      apiKey,
      userId: 'user-1',
      provider: 'openai',
      kek,
    });
    const second = encryptApiKey({
      apiKey,
      userId: 'user-1',
      provider: 'openai',
      kek,
    });

    expect(first.nonce.equals(second.nonce)).toBe(false);
    expect(first.ciphertext.equals(second.ciphertext)).toBe(false);
  });

  it('rejects a ciphertext moved to another account or provider', () => {
    const encrypted = encryptApiKey({
      apiKey,
      userId: 'user-1',
      provider: 'openai',
      kek,
    });

    expect(() =>
      decryptApiKey({
        encrypted,
        userId: 'user-2',
        provider: 'openai',
        kek,
      }),
    ).toThrow();
    expect(() =>
      decryptApiKey({
        encrypted,
        userId: 'user-1',
        provider: 'xai',
        kek,
      }),
    ).toThrow();
  });

  it('rejects a tampered ciphertext', () => {
    const encrypted = encryptApiKey({
      apiKey,
      userId: 'user-1',
      provider: 'openai',
      kek,
    });
    encrypted.ciphertext[0] ^= 0xff;

    expect(() =>
      decryptApiKey({
        encrypted,
        userId: 'user-1',
        provider: 'openai',
        kek,
      }),
    ).toThrow();
  });

  it('rewraps the data key without decrypting the API key', () => {
    const encrypted = encryptApiKey({
      apiKey,
      userId: 'user-1',
      provider: 'anthropic',
      kek,
    });
    const nextKek = randomBytes(32);
    const wrapped = rewrapDek({
      encrypted,
      userId: 'user-1',
      provider: 'anthropic',
      fromKek: kek,
      toKek: nextKek,
      toVersion: 2,
    });
    const opened = decryptApiKey({
      encrypted: { ...encrypted, ...wrapped },
      userId: 'user-1',
      provider: 'anthropic',
      kek: nextKek,
    });

    try {
      expect(opened.toString('utf8')).toBe(apiKey);
    } finally {
      opened.fill(0);
    }

    expect(() =>
      decryptApiKey({
        encrypted: { ...encrypted, ...wrapped },
        userId: 'user-1',
        provider: 'anthropic',
        kek,
      }),
    ).toThrow();
  });
});
