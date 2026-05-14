export enum WebhookEvent {
  MESSAGE_SENT = 'message.sent',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
  MESSAGE_FAILED = 'message.failed',
  MESSAGE_INCOMING = 'message.incoming',
  SESSION_CONNECTED = 'session.connected',
  SESSION_DISCONNECTED = 'session.disconnected',
  ALL = '*',
}
