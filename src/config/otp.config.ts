import { registerAs } from '@nestjs/config';

export default registerAs('otp', () => ({
  expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  rateLimitWindow: parseInt(process.env.OTP_RATE_LIMIT_WINDOW || '600', 10),
  rateLimitMax: parseInt(process.env.OTP_RATE_LIMIT_MAX || '3', 10),
  otpLength: parseInt(process.env.OTP_LENGTH || '6', 10),
  messageTemplate:
    process.env.OTP_MESSAGE_TEMPLATE ||
    'Your verification code is: {otp}. Valid for {minutes} minutes. Do not share this code.',
}));
