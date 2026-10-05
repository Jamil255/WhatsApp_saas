# Architecture

## System overview

```text
Browser / API client
        |
        v
Next.js frontend  --->  NestJS API  --->  PostgreSQL
        |                    |
        |                    +--> pg-boss queue --> message worker
        |                    |
        |                    +--> Baileys WhatsApp session
        |                    |
        |                    +--> webhook delivery + audit logs
        |
        +--> QR stream for live connection status
```

## Backend modules

- **Auth** — login, OTP, JWT refresh, logout, and API credentials.
- **Tenants** — organization creation and lifecycle management.
- **WhatsApp** — QR connection, OTP verification, status, reconnect, and disconnect flows.
- **Messaging** — text, OTP, media, template, bulk, and message history operations.
- **Templates** — reusable message content owned by a tenant.
- **Webhooks** — endpoint registration, signed events, and delivery logs.
- **Admin** — tenant visibility, force disconnect, platform overview, and audit logs.
- **Monitoring** — health checks for the API and dependent services.

## Tenant isolation

Tenant-scoped operations should resolve the authenticated tenant from the access token or API credential. Controllers and services must not trust a tenant identifier supplied by an untrusted client when the authenticated context already provides one.

Session credentials are sensitive. Keep them encrypted at rest, avoid logging them, and limit access to the WhatsApp session service.

## Frontend surfaces

The Next.js app uses route groups to keep the public, workspace, and admin experiences separate:

- `app/page.tsx` — Nexora public marketing site.
- `app/login/page.tsx` — workspace authentication.
- `app/(workspace)/dashboard/*` — tenant workspace routes.
- `app/(admin)/admin/*` — platform admin routes.
- `components/app-shell.tsx` — shared authenticated navigation shell.
- `lib/api.ts` — centralized API client and token storage integration.

## Async delivery

Messaging requests create durable records and queue work for the message worker. Delivery and inbound events can be dispatched to registered webhooks. Use idempotency keys, retry limits, structured logs, and dead-letter handling before operating at high volume.
