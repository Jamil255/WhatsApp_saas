import {
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptAES(text: string, keyString: string): string {
  const key = Buffer.from(keyString, 'hex');
  if (key.length !== 32) throw new Error('Invalid encryption key length');
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptAES(encryptedText: string, keyString: string): string {
  const key = Buffer.from(keyString, 'hex');
  if (key.length !== 32) throw new Error('Invalid encryption key length');

  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted text format');

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
/** Generate a random hex string */
export function generateRandomHex(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Generate an API client ID */
export function generateClientId(): string {
  return `cli_${randomBytes(16).toString('hex')}`;
}

/** Generate an API secret */
export function generateApiSecret(): string {
  return `sec_${randomBytes(32).toString('hex')}`;
}

/** Create HMAC-SHA256 signature */
export function createHmacSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Generate a numeric OTP */
export function generateOtp(length = 6): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  return Math.floor(min + Math.random() * (max - min)).toString();
}
