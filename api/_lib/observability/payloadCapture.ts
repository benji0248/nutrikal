import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import type { CapturedPayload, PayloadType } from './types.js';

type CaptureMode = 'none' | 'metadata' | 'full';

interface CapturePolicy {
  mode: CaptureMode;
  retentionDays: number;
  encryptionKey?: Buffer;
}

let warnedMissingKey = false;

function readEncryptionKey(): Buffer | undefined {
  const encoded = process.env.AI_OBSERVABILITY_ENCRYPTION_KEY;
  if (!encoded) return undefined;
  const key = Buffer.from(encoded, 'base64');
  return key.length === 32 ? key : undefined;
}

export function readCapturePolicy(): CapturePolicy {
  const requested = process.env.AI_OBSERVABILITY_CAPTURE;
  const allowSensitive = process.env.NODE_ENV !== 'production'
    || process.env.AI_OBSERVABILITY_ALLOW_SENSITIVE === 'true';
  const mode: CaptureMode = requested === 'full' && allowSensitive
    ? 'full'
    : requested === 'metadata' || requested === 'full'
      ? 'metadata'
      : 'none';
  const retention = Number(process.env.AI_OBSERVABILITY_PAYLOAD_RETENTION_DAYS ?? '7');
  return {
    mode,
    retentionDays: Number.isFinite(retention) && retention > 0 ? retention : 7,
    encryptionKey: readEncryptionKey(),
  };
}

function serialize(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function encrypt(content: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function capturePayload(
  type: PayloadType,
  value: unknown,
  policy: CapturePolicy,
): CapturedPayload | undefined {
  if (policy.mode === 'none') return undefined;

  const content = serialize(value);
  const base: CapturedPayload = {
    type,
    hash: createHash('sha256').update(content).digest('hex'),
    sizeBytes: Buffer.byteLength(content),
    redactionVersion: 'v1',
  };

  if (policy.mode !== 'full') return base;
  if (!policy.encryptionKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        '[nutrikal:observability] full payload capture requires a 32-byte base64 AI_OBSERVABILITY_ENCRYPTION_KEY; storing metadata only',
      );
    }
    return base;
  }

  const expiresAt = new Date(Date.now() + policy.retentionDays * 86_400_000).toISOString();
  return {
    ...base,
    encryptedContent: encrypt(content, policy.encryptionKey),
    expiresAt,
  };
}
