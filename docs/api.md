# API guide

The API is prefixed with `/api`. Swagger is available locally at `http://localhost:3030/docs`.

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "your-password"
}
```

Use the returned access token as:

```http
Authorization: Bearer <access-token>
```

Refresh and logout endpoints are available at `/api/auth/refresh` and `/api/auth/logout`.

## WhatsApp sessions

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/sessions/connect` | Start a session connection flow |
| `POST` | `/api/sessions/verify-otp` | Verify the connection OTP |
| `POST` | `/api/sessions/resend-otp` | Resend a connection OTP |
| `GET` | `/api/sessions/status` | Read the current session status |
| `POST` | `/api/sessions/restart` | Restart a session |
| `POST` | `/api/sessions/disconnect` | Disconnect the current session |
| `GET` | `/api/qr/stream` | Stream QR/session events with SSE |

The frontend opens the QR stream at `/api/qr/stream?tenantId=<tenant-id>` after a connection is started.

## Messaging

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/messaging/send-message` | Send a text message |
| `POST` | `/api/messaging/send-otp` | Send an OTP message |
| `POST` | `/api/messaging/send-media` | Send media |
| `POST` | `/api/messaging/send-template` | Send a saved template |
| `POST` | `/api/messaging/send-bulk` | Queue a bulk campaign |
| `GET` | `/api/messaging/messages` | List message history |
| `GET` | `/api/messaging/messages/:id` | Read one message |

Example request shape for a text message:

```bash
curl -X POST http://localhost:3030/api/messaging/send-message \
  -H "Authorization: Bearer $NEXORA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"+923001234567","text":"Hello from Nexora"}'
```

Use the Swagger document as the source of truth for exact DTO fields and response envelopes as the API evolves.

## Health and administration

- `GET /health` — process health endpoint.
- `GET /api/admin/stats/overview` — platform overview for authorized admins.
- `GET /api/admin/tenants` — list organizations for authorized admins.
- `GET /api/admin/audit-logs` — read platform audit logs.

Admin endpoints require the appropriate role and should never be exposed without authentication and network controls.
