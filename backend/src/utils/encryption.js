import crypto from 'crypto';
import env from '../config/env.js';

// Development fallback key (32 bytes hex) - ALWAYS override via ENCRYPTION_KEY in production!
const DEV_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ALGORITHM = 'aes-256-gcm';

/**
 * Get active 32-byte key buffer for AES-256-GCM.
 */
function getKeyBuffer() {
  const keyHex = process.env.ENCRYPTION_KEY || DEV_ENCRYPTION_KEY;
  if (keyHex.length !== 64) {
    // If key is provided as raw string instead of 64-char hex, derive 32-byte key using SHA-256
    return crypto.createHash('sha256').update(keyHex).digest();
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt sensitive plaintext string using AES-256-GCM.
 * Generates a unique, cryptographically random 12-byte IV for every invocation.
 * Returns { ciphertext, iv, authTag, version }
 */
export function encryptData(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return { ciphertext: '', iv: '', authTag: '', version: 'v1' };
  }

  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag,
    version: 'v1',
  };
}

/**
 * Decrypt AES-256-GCM payload.
 * Accepts { ciphertext, iv, authTag } object.
 * Returns plaintext string.
 */
export function decryptData(payload) {
  if (!payload || !payload.ciphertext) {
    return '';
  }

  try {
    const key = getKeyBuffer();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed (tampered data or wrong key):', error.message);
    throw new Error('Failed to decrypt sensitive data payload.');
  }
}

/**
 * Data Sensitivity Classifier
 */
export const SENSITIVITY_LEVELS = ['public', 'internal', 'private', 'sensitive', 'critical'];

export function getRecommendedSensitivity(category) {
  switch (category) {
    case 'financial':
    case 'property_legal':
    case 'insurance':
    case 'medical_health':
      return 'sensitive';
    case 'passwords_credentials':
      return 'critical';
    case 'personal_memories':
    case 'digital_accounts':
      return 'private';
    default:
      return 'internal';
  }
}
