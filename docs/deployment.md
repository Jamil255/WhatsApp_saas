# Deployment

## Recommended production layout

Run the API and worker in a private application network, PostgreSQL in a managed or hardened database service, and the Next.js frontend behind a TLS-terminating reverse proxy.

```text
Internet -> reverse proxy / TLS
             |              |
             v              v
       Next.js :3001   NestJS :3030
                              |
                    PostgreSQL + queue
```

## Backend release

```bash
npm ci
npm run build
npm run migration:run
npm run start:prod
```

Do not run development watchers in production. Use a process manager or container orchestrator with restart policies and separate logs for the API and worker responsibilities.

## Frontend release

```bash
cd frontend
npm ci
npm run build
npm run start
```

Set `NEXT_PUBLIC_API_URL` to the public API base URL before building the frontend. If the API is served behind a reverse proxy, keep the `/api` prefix consistent.

## Security checklist

- Use strong, unique JWT and database secrets.
- Put the API behind HTTPS and a trusted reverse proxy.
- Restrict PostgreSQL and queue access to private networks.
- Rotate API credentials and invalidate old secrets immediately.
- Encrypt WhatsApp session credentials at rest.
- Redact tokens, message content, and phone numbers from logs where possible.
- Configure rate limits and outbound messaging consent controls.
- Back up PostgreSQL and test restore procedures.
- Monitor `/health`, queue depth, webhook failures, and reconnect counts.

## Operational disclaimer

WhatsApp account safety depends on messaging behavior, consent, volume, and applicable platform rules. Nexora should be used for opted-in transactional, support, and business communication; avoid unsolicited bulk messaging.
