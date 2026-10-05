# Nexora frontend

The Next.js + shadcn-style frontend for the Nexora WhatsApp messaging platform.

## Run locally

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

The app runs on `http://localhost:3001` by default so it can sit beside the NestJS API on port 3030. Set `NEXT_PUBLIC_API_URL` to the API base URL if the backend runs on another port.

## Included surfaces

- Public marketing site at `/`
- Authenticated tenant workspace at `/dashboard`
- WhatsApp connection flow at `/dashboard/connect` (REST + QR SSE ready)
- Shared inbox, broadcasts, templates, analytics, team, settings, and developer tools
- Super-admin console at `/admin/dashboard`
- Organization management, platform messages, system health, audit logs, and admin settings

## Product branding

The product is branded as **Nexora**. The repository keeps its original slug for compatibility, while the customer-facing application, metadata, and documentation use Nexora.

The dashboard screens ship with realistic preview data so the UI is useful before a tenant has live records. API access is centralized in `lib/api.ts`; wire list endpoints into each screen as the backend data becomes available.
