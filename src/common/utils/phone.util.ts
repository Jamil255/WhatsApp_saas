const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/** Normalize a phone number to E.164 format */
export function normalizeE164(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

/** Validate E.164 format */
export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

/** Convert E.164 to WhatsApp JID */
export function toWhatsAppJid(phone: string): string {
  const number = phone.replace('+', '');
  return `${number}@s.whatsapp.net`;
}

/** Extract phone number from WhatsApp JID */
export function fromWhatsAppJid(jid: string): string {
  const number = jid.split('@')[0].split(':')[0];
  return `+${number}`;
}
