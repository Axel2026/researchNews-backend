import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const DEK_BYTES = 32;

export const KEK_VERSION = 1;

export type EncryptedApiKey = {
  wrappedDek: Buffer;
  wrapNonce: Buffer;
  wrapTag: Buffer;
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
  kekVersion: number;
  last4: string;
};

export type DecryptApiKeyParams = {
  encrypted: EncryptedApiKey;
  userId: string;
  provider: string;
  kek: Buffer;
};

export type EncryptApiKeyParams = {
  apiKey: string;
  userId: string;
  provider: string;
  kek: Buffer;
  kekVersion?: number;
};

export type RewrapDekParams = {
  encrypted: EncryptedApiKey;
  userId: string;
  provider: string;
  fromKek: Buffer;
  toKek: Buffer;
  toVersion: number;
};

type Seal = {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
};

function associatedData(
  userId: string,
  provider: string,
  kekVersion?: number,
): Buffer {
  const parts =
    kekVersion === undefined
      ? [userId, provider]
      : [String(kekVersion), userId, provider];
  return Buffer.from(parts.join('|'), 'utf8');
}

function seal(key: Buffer, plaintext: Buffer, aad: Buffer): Seal {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce, {
    authTagLength: TAG_BYTES,
  }) as CipherGCM;
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, nonce, tag: cipher.getAuthTag() };
}

function open(key: Buffer, sealed: Seal, aad: Buffer): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, sealed.nonce, {
    authTagLength: TAG_BYTES,
  }) as DecipherGCM;
  decipher.setAAD(aad);
  decipher.setAuthTag(sealed.tag);
  return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]);
}

function wipe(buffer: Buffer): void {
  buffer.fill(0);
}

export function encryptApiKey({
  apiKey,
  userId,
  provider,
  kek,
  kekVersion = KEK_VERSION,
}: EncryptApiKeyParams): EncryptedApiKey {
  const trimmed = apiKey.trim();
  const plaintext = Buffer.from(trimmed, 'utf8');
  const dek = randomBytes(DEK_BYTES);
  const dataAad = associatedData(userId, provider);
  // The wrap binds the version so a rotated KEK cannot open an old DEK.
  // The data AAD leaves the version out, so rotation rewraps the DEK only.
  const wrapAad = associatedData(userId, provider, kekVersion);

  try {
    const data = seal(dek, plaintext, dataAad);
    const wrap = seal(kek, dek, wrapAad);
    return {
      wrappedDek: wrap.ciphertext,
      wrapNonce: wrap.nonce,
      wrapTag: wrap.tag,
      ciphertext: data.ciphertext,
      nonce: data.nonce,
      tag: data.tag,
      kekVersion,
      last4: trimmed.slice(-4),
    };
  } finally {
    wipe(dek);
    wipe(plaintext);
  }
}

export function decryptApiKey({
  encrypted,
  userId,
  provider,
  kek,
}: DecryptApiKeyParams): Buffer {
  const wrapAad = associatedData(userId, provider, encrypted.kekVersion);
  const dek = open(
    kek,
    {
      ciphertext: encrypted.wrappedDek,
      nonce: encrypted.wrapNonce,
      tag: encrypted.wrapTag,
    },
    wrapAad,
  );

  try {
    return open(
      dek,
      {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        tag: encrypted.tag,
      },
      associatedData(userId, provider),
    );
  } finally {
    wipe(dek);
  }
}

export function rewrapDek({
  encrypted,
  userId,
  provider,
  fromKek,
  toKek,
  toVersion,
}: RewrapDekParams): Pick<
  EncryptedApiKey,
  'wrappedDek' | 'wrapNonce' | 'wrapTag' | 'kekVersion'
> {
  const dek = open(
    fromKek,
    {
      ciphertext: encrypted.wrappedDek,
      nonce: encrypted.wrapNonce,
      tag: encrypted.wrapTag,
    },
    associatedData(userId, provider, encrypted.kekVersion),
  );

  try {
    const wrap = seal(toKek, dek, associatedData(userId, provider, toVersion));
    return {
      wrappedDek: wrap.ciphertext,
      wrapNonce: wrap.nonce,
      wrapTag: wrap.tag,
      kekVersion: toVersion,
    };
  } finally {
    wipe(dek);
  }
}
