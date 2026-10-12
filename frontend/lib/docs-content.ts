export type DocsEndpoint = {
  id: string;
  title: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  auth: "Bearer token" | "API credentials" | "Public";
  description: string;
  fields?: string[];
  body?: string;
  response: string;
  status: number;
  note?: string;
};

export type DocsSection = {
  id: string;
  title: string;
  description: string;
  points?: string[];
  code?: { label: string; value: string };
  endpoint?: DocsEndpoint;
};

export type DocsArticle = {
  slug: string;
  group: string;
  title: string;
  description: string;
  keywords: string;
  sections: DocsSection[];
};

const wrap = (data: string) => `{
  "success": true,
  "data": ${data},
  "meta": {
    "timestamp": "2026-10-06T12:00:00.000Z",
    "processingTimeMs": 12
  }
}`;

const queued = wrap(`{
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "to": "+923001234567",
    "status": "queued",
    "queuedAt": "2026-10-06T12:00:00.000Z"
  }`);

export const docsArticles: DocsArticle[] = [
  {
    slug: "why-nexora", group: "Get started", title: "Why Nexora",
    description: "What Nexora is, the problems it solves, where to use it, and the benefits and tradeoffs.",
    keywords: "what is nexora why use it problem solution benefits use cases self hosted whatsapp gateway Baileys QR CRM ERP support appointment",
    sections: [
      { id: "what-is-nexora", title: "What is Nexora?", description: "Nexora is a self-hosted WhatsApp automation gateway for developers and teams. An organization links a WhatsApp number by scanning a QR code; its own application can then send messages through Nexora's REST API and receive events through webhooks. The backend uses Baileys and a WhatsApp Web session, not Meta's official WhatsApp Business Platform API.", points: ["Each tenant has its own API credentials and one linked WhatsApp session.", "The platform includes QR pairing, OTP verification, message queuing, status records, incoming-message processing, and signed webhooks.", "It is open source and designed to run on infrastructure your team operates."], code: { label: "Where Nexora fits", value: "Your app (CRM / ERP / support / appointments)\n                 | REST API request\n                 v\n             Nexora API + queue\n                 | linked WhatsApp Web session\n                 v\n         Customer's WhatsApp\n                 | inbound and delivery events\n                 v\n          Your webhook endpoint" } },
      { id: "the-problem", title: "What problem does it solve?", description: "Sending one message is only a small part of a usable WhatsApp integration. A product also needs to keep numbers connected, protect credentials, separate customers, absorb traffic spikes, handle incoming messages, and explain what happened after an API call. Rebuilding all of that for every application creates duplicated work and operational blind spots.", points: ["A disconnected linked device can interrupt sends even when your app is otherwise healthy.", "Without tenant boundaries, one organization's number, keys, or history can be mixed with another's.", "An accepted request is not the same as a delivered message; queue and status records make that distinction visible."] },
      { id: "how-it-works", title: "How does it work?", description: "A platform admin provisions a tenant. That organization connects its WhatsApp number and verifies it. Its server calls Nexora with tenant API credentials; Nexora queues the message, sends it through the linked session, records status changes, and can notify a registered webhook. Incoming WhatsApp messages are also processed and dispatched as message.incoming events.", points: ["Provision tenant → scan QR → verify OTP → monitor session status.", "Send through REST API → receive a queued response → inspect message status or handle a signed webhook.", "A single deployment can host multiple organizations; the current backend models one WhatsApp session per tenant."] },
      { id: "use-cases", title: "Where would you use it?", description: "Nexora is a connection layer between an existing product and WhatsApp—not a replacement for your CRM, ERP, booking, or support application. The application decides what to send and when; Nexora handles the WhatsApp connection and delivery workflow.", points: ["Appointments: send a confirmation or reminder after a booking is created.", "Commerce and ERP: send order updates or transaction notices from backend events.", "Authentication: deliver a WhatsApp OTP through the messaging API.", "Support: receive incoming-message events at a webhook and route them into your own support system.", "Multi-organization SaaS: provision separate tenants, API credentials, and linked numbers. Get consent and follow applicable platform rules before campaigns or bulk sends."] },
      { id: "benefits", title: "Why use Nexora?", description: "Use Nexora when you want a reusable, self-hosted integration layer instead of building QR/session management, a REST API, message jobs, credentials, and webhooks from scratch.", points: ["Faster integration: your app calls one API rather than directly managing WhatsApp Web sockets.", "Clear boundaries: tenant-specific credentials, sessions, messages, and webhook configuration.", "Operational visibility: queued responses, message records, session status, health, and admin audit APIs.", "Deployment control: run and inspect the source code and PostgreSQL-backed queue on your own infrastructure."] },
      { id: "cost-and-tradeoffs", title: "Costs and important tradeoffs", description: "Nexora is not a free version of Meta's official API. Its message path uses an unofficial WhatsApp Web connection through Baileys rather than calling the official Cloud API. That is different from saying messaging is free: hosting and operations still cost money, and any provider-fee comparison depends on your actual setup and current terms.", points: ["WhatsApp may change its Web protocol or restrict automated accounts; connections can break and account restrictions are a real risk.", "A queued API response does not guarantee delivery. Monitor the linked session and handle failures.", "Self-hosting means maintaining PostgreSQL, backups, secrets, TLS, and the application process. This project uses pg-boss with PostgreSQL; Redis is not part of its current queue stack.", "Some dashboard screens currently show sample data; use the backend APIs for live operational status until those screens are wired up.", "Choose Meta's official WhatsApp Business Platform when official support, compliance tooling, provider SLAs, or approved template workflows are requirements."] },
    ],
  },
  {
    slug: "quickstart", group: "Get started", title: "Quickstart",
    description: "Set up Nexora locally, sign in, connect a number, and send your first message.",
    keywords: "setup install local postgres database first message",
    sections: [
      { id: "prerequisites", title: "Before you begin", description: "You need Node.js 20+, PostgreSQL, a test WhatsApp account, and the repository. The API uses PostgreSQL for data and pg-boss jobs. The local default API port is 3000; the frontend dev server uses 3001.", points: ["Create an empty PostgreSQL database and set DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, and DB_DATABASE.", "Copy .env.example to .env at the repository root. Replace JWT_SECRET and JWT_REFRESH_SECRET before using real accounts.", "Set ENCRYPTION_KEY to a securely generated 64-character hex string before provisioning tenants or rotating API credentials. This required key is currently missing from .env.example.", "The actual API URL is determined by PORT; change API_BASE_URL below if your instance uses a different port."], code: { label: "Local setup", value: "git clone https://github.com/Jamil255/WhatsApp_saas.git\ncd WhatsApp_saas\ncp .env.example .env\n# Add ENCRYPTION_KEY=<64 hex characters> to .env\nnpm install\nnpm run start:dev\n\n# In another terminal\ncd frontend\nnpm install\nnpm run dev" } },
      { id: "first-request", title: "Make your first request", description: "Check the API health endpoint before authenticating. Set an API base URL once, then reuse it in the examples throughout these docs.", code: { label: "Terminal", value: "export API_BASE_URL=http://localhost:3000\ncurl -i \"$API_BASE_URL/health\"" }, points: ["PowerShell: use $env:API_BASE_URL = 'http://localhost:3000' and $env:API_BASE_URL in place of shell-style $API_BASE_URL.", "A healthy database reports services.database as up. A degraded response means the API is reachable but needs attention."] },
      { id: "next-steps", title: "From account to delivery", description: "Follow this order once the API is healthy: sign in, connect and verify a WhatsApp session, then send a message using tenant API credentials.", points: ["Use Authentication to obtain a Bearer token and tenant API credentials.", "Use Sessions to connect a WhatsApp number and verify the OTP.", "Use Messaging API to enqueue your first text message and inspect its delivery status."] },
    ],
  },
  {
    slug: "authentication", group: "Get started", title: "Authentication",
    description: "Understand JWT sessions and tenant-scoped server API credentials.",
    keywords: "login bearer jwt token api secret client id rotate otp",
    sections: [
      { id: "auth-model", title: "Two credential types", description: "Dashboard, session, tenant, and admin routes use Authorization: Bearer <access token>. Messaging and webhook registration use X-Client-Id plus X-Api-Secret. Do not send both types by default or put an API secret in client-side code.", points: ["A tenant admin account is provisioned when a super admin creates a tenant; there is no public signup endpoint in this API.", "Store API secrets server-side and rotate them if compromised. Rotating invalidates the previous pair immediately."] },
      { id: "login", title: "Sign in", description: "Exchange a provisioned user's email and password for access and refresh tokens.", endpoint: { id: "login", title: "Create a login session", method: "POST", path: "/api/auth/login", auth: "Public", description: "Returns accessToken, refreshToken and the current user in the response data.", fields: ["email — required, valid email address", "password — required"], body: '{"email":"admin@example.com","password":"your-password"}', status: 200, response: wrap(`{
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "tenant_admin",
      "tenantId": "550e8400-e29b-41d4-a716-446655440001"
    }
  }`) } },
      { id: "refresh", title: "Refresh a session", description: "Exchange a valid refresh token for a new access and refresh token pair. The old refresh token is revoked.", endpoint: { id: "refresh", title: "Refresh tokens", method: "POST", path: "/api/auth/refresh", auth: "Public", description: "Rotates the refresh token.", fields: ["refreshToken — required string"], body: '{"refreshToken":"eyJ..."}', status: 200, response: wrap('{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }') } },
      { id: "rotate-keys", title: "Rotate API credentials", description: "A logged-in tenant user can rotate the client ID and secret. Update server integrations immediately after this call.", endpoint: { id: "rotate-keys", title: "Rotate the API key pair", method: "POST", path: "/api/auth/api-keys/rotate", auth: "Bearer token", description: "Old credentials stop working immediately.", status: 200, response: wrap(`{
    "message": "API keys generated successfully. Please dont share this secret with anyone.",
    "data": { "clientId": "cli_example", "apiSecret": "sec_example" }
  }`), note: "The controller nests credentials in data.data inside the standard envelope. Never log this response." } },
      { id: "credentials", title: "Use API credentials", description: "Supply the issued pair as HTTP headers only from a trusted server. To view an existing secret, request and verify an OTP using /api/auth/api-keys/view/request-otp and /api/auth/api-keys/view/verify.", code: { label: "Server-side headers", value: "X-Client-Id: cli_your_client_id\nX-Api-Secret: sec_your_api_secret" } },
      { id: "errors", title: "Errors and status codes", description: "Error responses use a different envelope from successful responses. Inspect the HTTP status first, then error.code and error.message. Validation errors can return an array of messages.", points: ["400: invalid request body or query", "401: missing or invalid credentials", "403: authenticated but insufficient role", "409: conflicting session or resource", "429: rate limit exceeded"], code: { label: "Example · 401 Unauthorized", value: '{\n  "success": false,\n  "error": {\n    "code": "UNAUTHORIZED",\n    "message": "Invalid API credentials.",\n    "statusCode": 401\n  },\n  "meta": {\n    "timestamp": "2026-10-06T12:00:00.000Z"\n  }\n}' } },
    ],
  },
  {
    slug: "sessions", group: "Guides", title: "WhatsApp sessions",
    description: "Pair a device, receive a QR code, verify the OTP, and inspect connection state.",
    keywords: "whatsapp qr code authenticated polling connect verify otp status disconnect restart",
    sections: [
      { id: "flow", title: "Connection flow", description: "Initiate a connection, then poll the authenticated QR state endpoint. Scan the QR in WhatsApp Linked Devices; the connected phone receives an OTP that must be verified before the session is active.", points: ["The QR state endpoint automatically uses the tenant from the Bearer token, so a tenant ID is never trusted from the browser.", "Poll every one to two seconds while connecting, then stop on pending_verification, connected, failed, or expired.", "All session operations require a Bearer token scoped to the tenant.", "Super admins can manage a selected organization through /api/admin/tenants/:id/connection endpoints."] },
      { id: "qr-state", title: "Read the QR state", description: "Poll this endpoint after calling connect. While the QR is active, qrCode contains a browser-ready image data URL.", endpoint: { id: "qr-state", title: "Get QR state", method: "GET", path: "/api/sessions/qr", auth: "Bearer token", description: "Returns the current session and QR lifecycle state as JSON.", status: 200, response: wrap('{ "status": "connecting", "qrStatus": "active", "qrCode": "data:image/png;base64,...", "attempt": 1, "maxAttempts": 5, "expiresAt": "2026-10-06T12:00:20.000Z" }'), note: "qrCode becomes null after scanning, expiry, or connection. Stop polling when the session reaches a terminal state." } },
      { id: "connect", title: "Start a connection", description: "Initiate pairing for the tenant associated with your Bearer token.", endpoint: { id: "connect", title: "Connect WhatsApp", method: "POST", path: "/api/sessions/connect", auth: "Bearer token", description: "Starts the connection and QR generation.", status: 200, response: wrap('{ "message": "Connection initiated. Poll the authenticated QR endpoint." }') } },
      { id: "verify", title: "Verify the OTP", description: "After scanning, submit the six-digit OTP delivered to the connected WhatsApp number.", endpoint: { id: "verify", title: "Verify session OTP", method: "POST", path: "/api/sessions/verify-otp", auth: "Bearer token", description: "Activates the pending session.", fields: ["otp — required six-digit numeric string"], body: '{"otp":"123456"}', status: 200, response: wrap('{ "status": "connected", "phoneNumber": "+923001234567", "message": "Session verified and activated successfully." }') } },
      { id: "status", title: "Check connection status", description: "Inspect the current state before sending or restarting.", endpoint: { id: "status", title: "Get session status", method: "GET", path: "/api/sessions/status", auth: "Bearer token", description: "Returns status, phone number and socket health; if no session exists, data is { status: 'no_session' }.", status: 200, response: wrap('{ "status": "no_session" }') } },
      { id: "disconnect", title: "Disconnect a session", description: "Explicitly destroy the current session when unlinking a workspace.", endpoint: { id: "disconnect", title: "Disconnect WhatsApp", method: "POST", path: "/api/sessions/disconnect", auth: "Bearer token", description: "Disconnects the current tenant session.", status: 200, response: wrap('{ "message": "WhatsApp session disconnected." }') } },
      { id: "restart", title: "Restart a session", description: "Request a fresh connection and QR after confirming the current session is not active.", endpoint: { id: "restart", title: "Restart WhatsApp session", method: "POST", path: "/api/sessions/restart", auth: "Bearer token", description: "Disconnects and reconnects the tenant session.", status: 200, response: wrap('{ "message": "Session restarted. Poll the authenticated QR endpoint." }') } },
    ],
  },
  {
    slug: "messaging", group: "API reference", title: "Messaging API",
    description: "Send text, media, OTP, template, or bulk messages and read delivery records.",
    keywords: "message sms send text media image document audio template bulk status list",
    sections: [
      { id: "requirements", title: "Before sending", description: "All messaging routes require X-Client-Id and X-Api-Secret. Send routes additionally require an active WhatsApp session and are rate-limited. Phone numbers must use E.164 format, such as +923001234567.", points: ["A 201 response means queued, not delivered. Inspect message records or subscribe to webhooks for later status changes.", "API credentials are tenant-scoped; requests cannot choose a different tenant in the body."] },
      { id: "send-message", title: "Send text", description: "Enqueue a text message to one recipient.", endpoint: { id: "send-message", title: "Send a text message", method: "POST", path: "/api/messaging/send-message", auth: "API credentials", description: "Queues a text message for asynchronous delivery.", fields: ["to — required E.164 number", "body — required string", "messageType — optional; defaults to text"], body: '{"to":"+923001234567","body":"Hello from Nexora"}', status: 201, response: queued } },
      { id: "send-media", title: "Send media", description: "Use a reachable media URL for image, video, document or audio.", endpoint: { id: "send-media", title: "Send a media message", method: "POST", path: "/api/messaging/send-media", auth: "API credentials", description: "Queues media from a URL.", fields: ["to — required E.164 number", "mediaUrl — required URL", "mediaType — image, video, document or audio", "caption, filename — optional"], body: '{"to":"+923001234567","mediaUrl":"https://example.com/image.jpg","mediaType":"image","caption":"Preview"}', status: 201, response: queued } },
      { id: "send-otp", title: "Send OTP", description: "Provide an OTP or let the server generate one. Secure the response because it contains the code.", endpoint: { id: "send-otp", title: "Send one-time password", method: "POST", path: "/api/messaging/send-otp", auth: "API credentials", description: "Queues an OTP and returns the code and expiry to the caller.", fields: ["to — required E.164 number", "otp — optional 4–8 digits", "expiryMinutes — optional 1–30"], body: '{"to":"+923001234567","expiryMinutes":5}', status: 201, response: wrap(`{
    "messageId": "550e8400-e29b-41d4-a716-446655440000",
    "to": "+923001234567",
    "status": "queued",
    "queuedAt": "2026-10-06T12:00:00.000Z",
    "otp": "123456",
    "expiresAt": "2026-10-06T12:05:00.000Z"
  }`) } },
      { id: "send-template", title: "Send a template", description: "Reference a saved template UUID and pass variable substitutions.", endpoint: { id: "send-template", title: "Send template message", method: "POST", path: "/api/messaging/send-template", auth: "API credentials", description: "Queues a predefined template message.", fields: ["to — required E.164 number", "templateId — required UUID", "variables — optional key/value map"], body: '{"to":"+923001234567","templateId":"550e8400-e29b-41d4-a716-446655440000","variables":{"name":"Aisha"}}', status: 201, response: queued } },
      { id: "send-bulk", title: "Send bulk", description: "Accepts up to 10,000 recipients in a background batch. Use this for approved campaigns only.", endpoint: { id: "send-bulk", title: "Queue a bulk job", method: "POST", path: "/api/messaging/send-bulk", auth: "API credentials", description: "Deduplicates recipients and queues a batch.", fields: ["recipients — required array of E.164 numbers", "messageType — text or template", "body — text content when sending text", "templateId, variables, batchDelay — optional as applicable"], body: '{"recipients":["+923001234567","+923001234568"],"messageType":"text","body":"Hello team"}', status: 202, response: wrap(`{
    "batchId": "batch_550e8400-e29b-41d4-a716-446655440000",
    "totalRecipients": 2,
    "status": "queued",
    "estimatedCompletionSeconds": 1
  }`) } },
      { id: "list-messages", title: "Inspect messages", description: "Fetch paginated tenant messages and follow up on individual IDs.", endpoint: { id: "list-messages", title: "List message records", method: "GET", path: "/api/messaging/messages?page=1&limit=20", auth: "API credentials", description: "Returns messages, total, page and limit.", status: 200, response: wrap('{ "messages": [], "total": 0, "page": 1, "limit": 20 }'), note: "Use GET /api/messaging/messages/{id} to retrieve one message with statusLogs." } },
    ],
  },
  {
    slug: "templates", group: "API reference", title: "Templates",
    description: "Create reusable message bodies and use their UUIDs in template sends.",
    keywords: "template create list patch delete variables marketing utility otp",
    sections: [
      { id: "model", title: "Template model", description: "Templates belong to the current tenant. Creating and managing them uses a Bearer token; sending one uses tenant API credentials on the Messaging API.", points: ["Supported categories: otp, marketing, utility, transactional.", "Placeholders use {{name}} syntax. Keep the variables array aligned with your body.", "A template must be active to render; new templates start in draft status, so activate before sending."] },
      { id: "create", title: "Create a template", description: "Store a reusable message body with its variables.", endpoint: { id: "create", title: "Create template", method: "POST", path: "/api/templates", auth: "Bearer token", description: "Creates a tenant-scoped template.", fields: ["name — required string", "category — otp, marketing, utility or transactional", "body — required string", "variables — optional string array", "language — optional; defaults to en"], body: '{"name":"order_update","category":"utility","body":"Hello {{name}}, your order is ready.","variables":["name"]}', status: 201, response: wrap(`{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "order_update",
    "category": "utility",
    "body": "Hello {{name}}, your order is ready.",
    "variables": ["name"],
    "status": "draft"
  }`), note: "The response is the persisted template entity and includes other metadata fields." } },
      { id: "list", title: "List templates", description: "Find IDs of templates in the current tenant.", endpoint: { id: "list", title: "List tenant templates", method: "GET", path: "/api/templates", auth: "Bearer token", description: "Returns non-deleted templates ordered newest first.", status: 200, response: wrap("[]") } },
      { id: "activate", title: "Activate a template", description: "Activate a draft before sending it through the Messaging API. Set TEMPLATE_ID to the UUID returned by the create or list endpoint.", endpoint: { id: "activate", title: "Update template status", method: "PATCH", path: "/api/templates/{id}", auth: "Bearer token", description: "Updates status or other editable fields for the current tenant.", fields: ["id — template UUID in the URL", "status — draft, active or archived", "name, body, variables — optional updates"], body: '{"status":"active"}', status: 200, response: wrap(`{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "order_update",
    "status": "active"
  }`) } },
    ],
  },
  {
    slug: "webhooks", group: "API reference", title: "Webhooks",
    description: "Register a callback and verify signed message and session events.",
    keywords: "callback hmac signature events register secret delivery",
    sections: [
      { id: "register", title: "Register a callback", description: "Each tenant has one webhook configuration. Registering again updates it. Omit secret to generate one, then store the returned secret securely.", endpoint: { id: "register", title: "Register or update webhook", method: "POST", path: "/api/webhooks/register", auth: "API credentials", description: "Registers a URL and optional event filters.", fields: ["url — required valid URL", "events — optional string array; ['*'] receives all", "secret — optional signing secret"], body: '{"url":"https://app.example.com/webhooks/nexora","events":["message.sent","message.delivered"]}', status: 201, response: wrap(`{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://app.example.com/webhooks/nexora",
    "events": ["message.sent", "message.delivered"],
    "secret": "your-generated-secret"
  }`), note: "The full saved entity may contain additional fields. Keep the secret off the client." } },
      { id: "delivery", title: "Verify a delivery", description: "The backend signs JSON.stringify(payload) with HMAC-SHA256 using your webhook secret, encoded as lowercase hex in X-Webhook-Signature. X-Webhook-Timestamp repeats payload.timestamp. Verify against the raw request body before parsing or reserializing it.", points: ["Return a 2xx response quickly; process work asynchronously.", "Use a constant-time signature comparison.", "Check timestamp freshness and make handlers idempotent. The payload contains event, timestamp, tenantId and data."], code: { label: "Node.js verification", value: `import { createHmac, timingSafeEqual } from "node:crypto";

const expected = createHmac("sha256", process.env.WEBHOOK_SECRET!)
  .update(rawBody)
  .digest("hex");
const actual = request.headers["x-webhook-signature"];
const valid = typeof actual === "string" &&
  actual.length === expected.length &&
  timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
if (!valid) throw new Error("Invalid webhook signature");` } },
      { id: "view", title: "Inspect configuration", description: "A signed-in workspace user can retrieve the current configuration.", endpoint: { id: "view", title: "Get webhook configuration", method: "GET", path: "/api/webhooks", auth: "Bearer token", description: "Returns current tenant webhook configuration or null.", status: 200, response: wrap("null") } },
      { id: "remove", title: "Remove the callback", description: "Stop event deliveries by deleting the tenant webhook configuration.", endpoint: { id: "remove", title: "Delete webhook configuration", method: "DELETE", path: "/api/webhooks", auth: "Bearer token", description: "Deletes the configuration.", status: 204, response: "(empty response body)", note: "HTTP 204 has no response body, regardless of the generic response interceptor." } },
    ],
  },
  {
    slug: "admin", group: "API reference", title: "Admin API",
    description: "Provision organizations and inspect platform-wide operational data.",
    keywords: "super admin tenant organization audit stats suspend force disconnect",
    sections: [
      { id: "permissions", title: "Super-admin access", description: "Platform admin routes and tenant provisioning require a Bearer token with the SUPER_ADMIN role. A regular workspace user will receive 403 even with a valid token.", points: ["Keep administrative tokens server-side and short-lived.", "Tenant IDs in paths are UUIDs, not slugs or display names."] },
      { id: "create-tenant", title: "Provision a tenant", description: "Creates an organization, admin user, and initial API credentials.", endpoint: { id: "create-tenant", title: "Create tenant", method: "POST", path: "/api/tenants", auth: "Bearer token", description: "SUPER_ADMIN only. Returns tenant, adminPassword and apiKeys inside data.", fields: ["companyName — required", "adminEmail — required email", "adminName — required", "plan — optional starter, professional or enterprise"], body: '{"companyName":"Acme","adminEmail":"admin@acme.example","adminName":"Aisha","plan":"starter"}', status: 201, response: wrap(`{
    "tenant": { "id": "550e8400-e29b-41d4-a716-446655440000", "companyName": "Acme" },
    "adminPassword": "generated-password",
    "apiKeys": { "clientId": "cli_example", "apiSecret": "sec_example" }
  }`), note: "Sensitive values are returned at creation. Deliver them securely; do not log or cache this response." } },
      { id: "overview", title: "Platform overview", description: "Monitor tenant count, message count and active WhatsApp sessions.", endpoint: { id: "overview", title: "Get platform statistics", method: "GET", path: "/api/admin/stats/overview", auth: "Bearer token", description: "SUPER_ADMIN only.", status: 200, response: wrap(`{
    "totalTenants": 3,
    "totalMessages": 150,
    "activeSessions": 2,
    "inMemorySockets": 2,
    "timestamp": "2026-10-06T12:00:00.000Z"
  }`) } },
      { id: "tenants", title: "List organizations", description: "Review tenants and linked session details.", endpoint: { id: "tenants", title: "List tenants", method: "GET", path: "/api/admin/tenants", auth: "Bearer token", description: "SUPER_ADMIN only; returns an array with session relation.", status: 200, response: wrap("[]") } },
      { id: "audit", title: "Read audit logs", description: "Paginate platform activity; optionally filter by tenant UUID.", endpoint: { id: "audit", title: "Query audit logs", method: "GET", path: "/api/admin/audit-logs?page=1&limit=50", auth: "Bearer token", description: "SUPER_ADMIN only.", status: 200, response: wrap('{ "logs": [], "total": 0, "page": 1, "limit": 50 }') } },
    ],
  },
  {
    slug: "operations", group: "Operations", title: "Self-hosting & operations",
    description: "Configure deployment, health checks, and safe production defaults.",
    keywords: "deploy production env postgres cors tls health troubleshooting pg boss",
    sections: [
      { id: "architecture", title: "System boundaries", description: "Next.js serves public pages and dashboards. NestJS serves the REST API and WhatsApp session lifecycle. PostgreSQL stores tenant data and pg-boss queue jobs. Protect the API, database and webhook endpoints independently.", points: ["The backend default is PORT=3000. The frontend dev server is 3001.", "Run database migrations before serving production traffic.", "A connected WhatsApp session depends on both persisted state and a live socket in the API process."] },
      { id: "environment", title: "Environment variables", description: "Start from the root .env.example rather than a generic DATABASE_URL; this project uses discrete DB_* variables. Check the current database configuration before deployment: DB_SYNCHRONIZE is interpreted incorrectly in the backend code, so do not assume its value prevents schema changes until that code is fixed.", code: { label: "Relevant .env keys", value: "NODE_ENV=production\nPORT=3000\nCORS_ORIGINS=https://app.example.com\nDB_HOST=your-private-db-host\nDB_PORT=5432\nDB_USERNAME=nexora\nDB_PASSWORD=replace-me\nDB_DATABASE=whatsapp_saas\nDB_SSL=true\nJWT_SECRET=replace-with-a-long-random-secret\nJWT_REFRESH_SECRET=replace-with-another-long-secret\nENCRYPTION_KEY=<64 random hex characters>" }, points: ["ENCRYPTION_KEY is required for tenant API credentials but is missing from the current .env.example.", "Store secrets in your deployment platform; never commit .env files.", "Terminate TLS at your ingress and allow only trusted frontend origins.", "Verify DB_SSL against your database provider configuration."] },
      { id: "health", title: "Health check", description: "Use the public health endpoint to inspect database reachability and active session count.", endpoint: { id: "health", title: "Check API health", method: "GET", path: "/health", auth: "Public", description: "Reports healthy or degraded plus service status.", status: 200, response: wrap(`{
    "status": "healthy",
    "timestamp": "2026-10-06T12:00:00.000Z",
    "services": { "database": "up", "activeSessions": 2 }
  }`) } },
      { id: "troubleshooting", title: "Troubleshooting", description: "Diagnose from the outside in: health, authentication, session status, then queue processing.", points: ["API unavailable: confirm PORT, ingress, DB connection and CORS_ORIGINS.", "QR does not appear: open the SSE stream before connect and check the tenantId query parameter.", "Message remains queued: confirm the session is connected and the pg-boss worker is processing jobs.", "401: check the credential type for the endpoint. 403: check role, especially SUPER_ADMIN."] },
    ],
  },
];

export const docsGroups = ["Get started", "Guides", "API reference", "Operations"];
export const getDocsArticle = (slug: string) => docsArticles.find((article) => article.slug === slug);
