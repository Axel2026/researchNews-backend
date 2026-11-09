import { and, eq } from 'drizzle-orm';
import { env } from '../env';
import { db } from '../db/client';
import { userAiKeys } from '../db/schema';
import { ensureUser } from '../users/repository';
import { decryptApiKey, encryptApiKey, type EncryptedApiKey } from './crypto';
import type { AiProvider } from './providers';

export type StoredAiKey = {
  provider: AiProvider;
  model: string;
  last4: string;
  updatedAt: string;
};

function toStored(row: {
  provider: string;
  model: string;
  last4: string;
  updatedAt: Date;
}): StoredAiKey {
  return {
    provider: row.provider as AiProvider,
    model: row.model,
    last4: row.last4,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAiKeys(userId: string): Promise<StoredAiKey[]> {
  const rows = await db
    .select({
      provider: userAiKeys.provider,
      model: userAiKeys.model,
      last4: userAiKeys.last4,
      updatedAt: userAiKeys.updatedAt,
    })
    .from(userAiKeys)
    .where(eq(userAiKeys.userId, userId));

  return rows.map(toStored);
}

export async function saveAiKey(
  userId: string,
  provider: AiProvider,
  model: string,
  apiKey?: string,
): Promise<StoredAiKey | 'missing_key'> {
  const updatedAt = new Date();

  if (!apiKey) {
    const updated = await db
      .update(userAiKeys)
      .set({ model, updatedAt })
      .where(
        and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
      )
      .returning({ last4: userAiKeys.last4 });

    const row = updated[0];
    if (!row) {
      return 'missing_key';
    }

    return toStored({ provider, model, last4: row.last4, updatedAt });
  }

  await ensureUser(userId);
  const encrypted = encryptApiKey({
    apiKey,
    userId,
    provider,
    kek: env.AI_KEYS_KEK,
  });

  await db
    .insert(userAiKeys)
    .values({
      userId,
      provider,
      model,
      ...encrypted,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [userAiKeys.userId, userAiKeys.provider],
      set: {
        model,
        wrappedDek: encrypted.wrappedDek,
        wrapNonce: encrypted.wrapNonce,
        wrapTag: encrypted.wrapTag,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        tag: encrypted.tag,
        kekVersion: encrypted.kekVersion,
        last4: encrypted.last4,
        updatedAt,
      },
    });

  return toStored({ provider, model, last4: encrypted.last4, updatedAt });
}

export async function deleteAiKey(
  userId: string,
  provider: AiProvider,
): Promise<void> {
  await db
    .delete(userAiKeys)
    .where(
      and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
    );
}

export async function hasAiKey(
  userId: string,
  provider: AiProvider,
): Promise<boolean> {
  const rows = await db
    .select({ provider: userAiKeys.provider })
    .from(userAiKeys)
    .where(
      and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
    )
    .limit(1);

  return Boolean(rows[0]);
}

export async function openAiKey(
  userId: string,
  provider: AiProvider,
): Promise<{ secret: Buffer; model: string } | null> {
  const rows = await db
    .select({
      wrappedDek: userAiKeys.wrappedDek,
      wrapNonce: userAiKeys.wrapNonce,
      wrapTag: userAiKeys.wrapTag,
      ciphertext: userAiKeys.ciphertext,
      nonce: userAiKeys.nonce,
      tag: userAiKeys.tag,
      kekVersion: userAiKeys.kekVersion,
      last4: userAiKeys.last4,
      model: userAiKeys.model,
    })
    .from(userAiKeys)
    .where(
      and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const encrypted: EncryptedApiKey = {
    wrappedDek: Buffer.from(row.wrappedDek),
    wrapNonce: Buffer.from(row.wrapNonce),
    wrapTag: Buffer.from(row.wrapTag),
    ciphertext: Buffer.from(row.ciphertext),
    nonce: Buffer.from(row.nonce),
    tag: Buffer.from(row.tag),
    kekVersion: row.kekVersion,
    last4: row.last4,
  };

  return {
    secret: decryptApiKey({
      encrypted,
      userId,
      provider,
      kek: env.AI_KEYS_KEK,
    }),
    model: row.model,
  };
}
