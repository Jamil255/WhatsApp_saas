import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  maxQrAttempts: parseInt(process.env.WA_MAX_QR_ATTEMPTS || '5', 10),
  qrTimeoutMs: parseInt(process.env.WA_QR_TIMEOUT_MS || '20000', 10),
  reconnectMaxRetries: parseInt(
    process.env.WA_RECONNECT_MAX_RETRIES || '10',
    10,
  ),
  reconnectBaseDelayMs: parseInt(
    process.env.WA_RECONNECT_BASE_DELAY_MS || '2000',
    10,
  ),
  reconnectMaxDelayMs: parseInt(
    process.env.WA_RECONNECT_MAX_DELAY_MS || '60000',
    10,
  ),
  sessionRecoveryDelayMs: parseInt(
    process.env.WA_SESSION_RECOVERY_DELAY_MS || '2000',
    10,
  ),
  healthCheckIntervalMs: parseInt(
    process.env.WA_HEALTH_CHECK_INTERVAL_MS || '30000',
    10,
  ),
  maxConcurrentSessions: parseInt(
    process.env.WA_MAX_CONCURRENT_SESSIONS || '50',
    10,
  ),
  browserName: process.env.WA_BROWSER_NAME || 'WhatsApp SaaS Platform',
}));
