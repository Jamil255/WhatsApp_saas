# Nexora documentation

Nexora is a self-hosted WhatsApp API gateway. A tenant connects a WhatsApp number through QR pairing; its application sends messages through REST endpoints and receives events through signed webhooks. The backend uses Baileys and a WhatsApp Web session, not Meta's official WhatsApp Business Platform API.

Nexora solves the infrastructure work around WhatsApp automation: keeping sessions connected, separating organizations, protecting API credentials, queuing sends, recording message status, and routing incoming or delivery events. It can sit between a CRM, ERP, booking system, or support application and that organization's linked WhatsApp account. [Read the product overview](./why-nexora.md) for use cases, benefits, costs, and tradeoffs.

The repository keeps its original GitHub slug for compatibility, but the product and customer-facing application are branded as **Nexora**.

## Documentation map

- [Why Nexora](./why-nexora.md) — what it is, the problem it solves, practical use cases, benefits, and limitations.
- [Getting started](./getting-started.md) — run the API, worker, database, and Next.js frontend locally.
- [Architecture](./architecture.md) — understand tenants, sessions, queues, webhooks, and the frontend surfaces.
- [API guide](./api.md) — authentication, WhatsApp sessions, messaging, webhooks, and API docs.
- [Deployment](./deployment.md) — production environment, build commands, health checks, and operational notes.
- [Branding](./branding.md) — Nexora name, voice, visual direction, and usage rules.

## Product surfaces

| Surface | Route | Audience |
| --- | --- | --- |
| Marketing site | `/` | Public visitors |
| Workspace sign in | `/login` | Workspace users |
| Tenant workspace | `/dashboard` | Organization admins and agents |
| WhatsApp connection | `/dashboard/connect` | Workspace operators |
| Admin console | `/admin/dashboard` | Platform administrators |
| Developer docs | `http://localhost:3001/docs` | Developers and operators |
| Swagger API explorer | `http://localhost:3000/docs` by default (`PORT` may differ) | Interactive endpoint reference |

## Important disclaimer

Nexora is an independent project and is not affiliated with, endorsed by, or officially connected to Meta Platforms, Inc. or WhatsApp LLC. WhatsApp names and marks belong to their respective owners. Follow applicable terms, privacy requirements, and consent rules when sending messages.
