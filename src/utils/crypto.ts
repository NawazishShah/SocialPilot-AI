// ═══════════════════════════════════════════════════════════════
// Crypto Utilities — AES-256-GCM encryption for credentials
// ═══════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { env } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING: BufferEncoding = 'hex';

/**
 * Derives a 32-byte key from the master ENCRYPTION_KEY using HKDF.
 */
function deriveKey(context: string): Buffer {
  return crypto.hkdfSync('sha256', env.ENCRYPTION_KEY, '', context, 32) as Buffer;
}

/**
 * Encrypts a plaintext string.
 * Returns: iv:ciphertext:authTag (all hex-encoded)
 */
export function encrypt(plaintext: string, context = 'default'): string {
  const key = deriveKey(context);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const authTag = cipher.getAuthTag().toString(ENCODING);

  return `${iv.toString(ENCODING)}:${encrypted}:${authTag}`;
}

/**
 * Decrypts an encrypted string produced by encrypt().
 */
export function decrypt(encryptedData: string, context = 'default'): string {
  const key = deriveKey(context);
  const [ivHex, ciphertext, authTagHex] = encryptedData.split(':');

  if (!ivHex || !ciphertext || !authTagHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hashes a string with SHA-256 (for prompt deduplication, etc.)
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
