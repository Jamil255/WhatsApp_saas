# 📱 WhatsApp SaaS Platform

A production-grade, multi-tenant WhatsApp messaging platform built with **NestJS**, **TypeORM**, **PostgreSQL**, and **Baileys** (WhatsApp Web reverse-engineered protocol). This platform allows businesses (tenants) to send WhatsApp messages, OTPs, media, and bulk campaigns through a simple REST API — without needing Meta's official Cloud API.

---

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [WhatsApp Session Lifecycle](#whatsapp-session-lifecycle)
- [Queue System (pg-boss)](#queue-system-pg-boss)
- [Webhook System](#webhook-system)
- [Environment Variables](#environment-variables)
- [Setup & Installation](#setup--installation)
- [Running the Project](#running-the-project)
- [Migrations](#migrations)

---

## Introduction

This platform solves a common business problem: **How can multiple businesses send WhatsApp messages programmatically without paying Meta's per-conversation fees?**

The answer is **Baileys** — a Node.js library that reverse-engineers the WhatsApp Web protocol. Instead of going through Meta's official (and expensive) Cloud API, each tenant simply scans a QR code with their personal or business WhatsApp number, and our platform manages the entire connection lifecycle, message queuing, delivery tracking, and webhook dispatching.

### How It Works (High-Level Flow)

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Tenant's   │       │   Our Backend    │       │    WhatsApp     │
│  Application │──────▶│   (NestJS API)   │──────▶│    Servers      │
│  (API Call)  │       │                  │       │  (via Baileys)  │
└──────────────┘       └──────────────────┘       └─────────────────┘
       │                       │                          │
       │   X-Client-Id        │   pg-boss Queue          │   WebSocket
       │   X-Api-Secret       │   Background Worker      │   Connection
       │                       │                          │
       ▼                       ▼                          ▼
   REST API              PostgreSQL DB            End User's WhatsApp
```

1. Tenant sends a `POST /api/messaging/send-message` request with API keys.
2. Backend validates the API keys, creates a message record, and pushes a job to the **pg-boss** queue.
3. A background worker picks up the job, finds the tenant's active Baileys socket, and sends the message via WhatsApp's WebSocket protocol.
4. Delivery status updates are tracked and optionally forwarded to the tenant's webhook URL.

---

## Architecture Overview

```
src/
├── common/                # Shared utilities, guards, interceptors, enums
│   ├── guards/            # ApiKeyGuard, JwtAuthGuard, RolesGuard, RateLimitGuard, ActiveSessionGuard
│   ├── filters/           # Global exception filter
│   ├── interceptors/      # Response transformer interceptor
│   ├── enums/             # SessionStatus, QrStatus, MessageType, Role
│   ├── decorators/        # @CurrentTenant(), @Roles()
│   └── utils/             # Crypto (AES-256-GCM, HMAC), phone normalization, OTP generation
│
├── config/                # Configuration modules (database, JWT, queue, WhatsApp, OTP)
│
├── database/
│   ├── entities/          # 15 TypeORM entities
│   ├── migrations/        # 12 sequential migrations
│   └── data-source.ts     # TypeORM data source for CLI
│
├── modules/
│   ├── auth/              # Authentication (Login, OTP, JWT, API Keys)
│   ├── tenant/            # Multi-tenant management (CRUD, suspend, activate)
│   ├── admin/             # Audit logging service
│   ├── whatsapp/
│   │   ├── session/       # WhatsApp session lifecycle (QR, OTP verify, connect/disconnect)
│   │   ├── messaging/     # Message sending (text, OTP, media, template, bulk)
│   │   └── qr/            # QR code SSE (Server-Sent Events) streaming
│   ├── webhook/           # Webhook registration, dispatch, delivery logs
│   ├── template/          # Message template management
│   └── monitoring/        # Health checks
│
├── jobs/                  # Queue workers (message sender, webhook dispatcher)
├── shared/                # Shared services (QueueService wrapper for pg-boss)
└── main.ts                # Application bootstrap with Swagger setup
```

---

## Tech Stack

| Component         | Technology                              | Purpose                                    |
| ----------------- | --------------------------------------- | ------------------------------------------ |
| **Framework**     | NestJS (TypeScript)                     | Modular, scalable backend framework        |
| **Database**      | PostgreSQL + TypeORM                    | Relational data with migrations            |
| **WhatsApp**      | `@whiskeysockets/baileys`               | WhatsApp Web protocol (unofficial)         |
| **Queue**         | `pg-boss` v12                           | PostgreSQL-based background job processing |
| **Auth**          | JWT (access + refresh tokens)           | Dashboard/admin authentication             |
| **API Security**  | AES-256-GCM encrypted API keys          | Tenant API authentication                  |
| **Passwords**     | Argon2 hashing                          | Secure password storage                    |
| **OTP**           | SHA-256 hashed, WhatsApp-delivered      | Phone verification & sensitive actions     |
| **API Docs**      | Swagger (OpenAPI)                       | Auto-generated interactive docs            |
| **Real-time**     | Server-Sent Events (SSE)               | QR code streaming to frontend              |

---

## Features

### Multi-Tenancy
- Complete data isolation via `tenantId` foreign key on all entities.
- Each tenant gets their own WhatsApp session, API credentials, webhooks, and message history.
- Super Admin can create, suspend, activate, and delete tenants.

### Authentication (Dual System)
- **Dashboard Auth:** Email/password login → JWT (access + refresh tokens).
- **WhatsApp OTP Login:** Request a 6-digit OTP via WhatsApp → verify → receive JWT.
- **API Auth:** `X-Client-Id` + `X-Api-Secret` headers for programmatic access.

### WhatsApp Session Management
- QR code generation with real-time SSE streaming to frontend.
- OTP verification after QR scan (security layer).
- Automatic reconnection with exponential backoff on network failures.
- Session states: `connecting` → `pending_verification` → `connected` → `disconnected` → `destroyed`.
- Health monitoring with periodic heartbeat checks.

### Messaging
- **Text Messages:** Simple WhatsApp text messages.
- **OTP Messages:** Auto-generated or custom OTP delivery.
- **Media Messages:** Image, video, document, and audio support via URL.
- **Template Messages:** Pre-defined templates with variable substitution (`{name}`, `{code}`, etc.).
- **Bulk Messaging:** Send to up to 10,000 recipients with configurable delay between messages.
- **Message Tracking:** Full status lifecycle (`queued` → `processing` → `sent` → `delivered` → `read` → `failed`).

### API Key Management
- Generate/rotate API keys via authenticated endpoint.
- Keys encrypted with **AES-256-GCM** (not hashed) — allows secure viewing.
- **View API Keys** requires OTP verification for security.
- Old keys are immediately invalidated on rotation.

### Webhook System
- Register a webhook URL to receive real-time message events.
- Payloads signed with HMAC-SHA256 for verification.
- Delivery logs with retry tracking.

### Audit Logging
- Every admin action (tenant CRUD, key rotation, login, OTP requests) is logged.
- Captures: userId, tenantId, action, resourceType, IP address, user agent, timestamps.

### Security Guards
- `ApiKeyGuard` — Validates `X-Client-Id` + `X-Api-Secret` for messaging APIs.
- `JwtAuthGuard` — Validates Bearer JWT for dashboard APIs.
- `RolesGuard` — Role-based access control (`super_admin`, `admin`, `user`).
- `ActiveSessionGuard` — Ensures tenant has a connected WhatsApp session before sending.
- `RateLimitGuard` — Per-tenant rate limiting to prevent abuse.

---

## Database Schema

The platform uses **15 entities** across **12 migrations**:

| Table                   | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `tenants`               | Business accounts with plan, status, rate limits     |
| `users`                 | Admin users per tenant (email, password, phone, role)|
| `api_credentials`       | AES-encrypted Client ID + API Secret per tenant      |
| `whatsapp_sessions`     | Baileys session state, creds (JSONB), phone, status  |
| `whatsapp_session_keys` | Multi-device encryption keys (Baileys auth state)    |
| `qr_sessions`           | QR code data, attempt count, expiry tracking         |
| `messages`              | All outbound messages with status and metadata       |
| `message_status_logs`   | Status change history per message                    |
| `otp_verifications`     | OTP records (hashed code, attempts, expiry)          |
| `refresh_tokens`        | JWT refresh tokens (hashed, with expiry)             |
| `templates`             | Reusable message templates with variables            |
| `webhooks`              | Registered webhook URLs per tenant                   |
| `webhook_delivery_logs` | Webhook dispatch history with response codes         |
| `audit_logs`            | Administrative action audit trail                    |

---

## API Reference

All endpoints are prefixed with `/api/`. Full interactive documentation is available at `http://localhost:3000/docs` (Swagger UI).

### Auth (`/api/auth`)

| Method | Endpoint                        | Auth       | Description                                      |
| ------ | ------------------------------- | ---------- | ------------------------------------------------ |
| POST   | `/auth/login`                   | None       | Email + password login → JWT tokens              |
| POST   | `/auth/otp/request`             | None       | Send OTP to WhatsApp number                      |
| POST   | `/auth/otp/verify`              | None       | Verify OTP → JWT tokens                          |
| POST   | `/auth/refresh`                 | None       | Exchange refresh token for new access token       |
| POST   | `/auth/logout`                  | None       | Revoke refresh token                             |
| POST   | `/auth/api-keys/rotate`         | JWT Bearer | Generate new API keys (invalidates old ones)     |
| POST   | `/auth/api-keys/view/request-otp` | JWT Bearer | Request OTP to view encrypted API keys         |
| POST   | `/auth/api-keys/view/verify`    | JWT Bearer | Verify OTP → reveal Client ID + API Secret       |

### Tenants (`/api/tenants`) — Super Admin Only

| Method | Endpoint                   | Auth       | Description                    |
| ------ | -------------------------- | ---------- | ------------------------------ |
| POST   | `/tenants`                 | JWT Bearer | Create new tenant + admin user |
| GET    | `/tenants`                 | JWT Bearer | List all tenants               |
| GET    | `/tenants/:id`             | JWT Bearer | Get tenant details             |
| PATCH  | `/tenants/:id`             | JWT Bearer | Update tenant                  |
| POST   | `/tenants/:id/suspend`     | JWT Bearer | Suspend tenant                 |
| POST   | `/tenants/:id/activate`    | JWT Bearer | Re-activate tenant             |
| DELETE | `/tenants/:id`             | JWT Bearer | Soft-delete tenant             |

### WhatsApp Sessions (`/api/sessions`)

| Method | Endpoint               | Auth       | Description                              |
| ------ | ---------------------- | ---------- | ---------------------------------------- |
| POST   | `/sessions/connect`    | JWT Bearer | Initiate WhatsApp connection (QR flow)   |
| POST   | `/sessions/verify-otp` | JWT Bearer | Verify session OTP after QR scan         |
| POST   | `/sessions/resend-otp` | JWT Bearer | Resend session verification OTP          |
| GET    | `/sessions/status`     | JWT Bearer | Get current session status               |
| POST   | `/sessions/disconnect` | JWT Bearer | Disconnect and destroy session           |
| POST   | `/sessions/restart`    | JWT Bearer | Disconnect + reconnect with new QR       |
| GET    | `/qr/stream`           | JWT Bearer | SSE stream for real-time QR code updates |

### Messaging (`/api/messaging`) — API Key Auth

| Method | Endpoint                 | Auth    | Description                                      |
| ------ | ------------------------ | ------- | ------------------------------------------------ |
| POST   | `/messaging/send-message`  | API Key | Send a text message                              |
| POST   | `/messaging/send-otp`      | API Key | Send OTP message                                 |
| POST   | `/messaging/send-media`    | API Key | Send image/video/document/audio                  |
| POST   | `/messaging/send-template` | API Key | Send template with variable substitution         |
| POST   | `/messaging/send-bulk`     | API Key | Bulk send to up to 10,000 recipients             |
| GET    | `/messaging/messages`      | API Key | List messages (paginated)                        |
| GET    | `/messaging/messages/:id`  | API Key | Get message details with status log              |

### Webhooks (`/api/webhooks`)

| Method | Endpoint              | Auth       | Description                      |
| ------ | --------------------- | ---------- | -------------------------------- |
| POST   | `/webhooks/register`  | API Key    | Register/update webhook URL      |
| GET    | `/webhooks`           | JWT Bearer | Get webhook configuration        |
| DELETE | `/webhooks`           | JWT Bearer | Remove webhook                   |

---

## Authentication & Security

The platform uses a **dual authentication** model:

### 1. Dashboard Authentication (JWT)
For human users accessing via browser/dashboard:
- Login with email + password, or WhatsApp OTP.
- Receives `accessToken` (15 min expiry) + `refreshToken` (7 day expiry).
- Access token is sent as `Authorization: Bearer <token>`.
- Refresh tokens are SHA-256 hashed before storage.

### 2. API Authentication (API Keys)
For programmatic/server-to-server access:
- Each tenant gets a `Client ID` (`cli_xxx`) and `API Secret` (`sec_xxx`).
- Sent as custom headers: `X-Client-Id` and `X-Api-Secret`.
- **API Secrets are encrypted with AES-256-GCM** in the database (not hashed).
- This allows secure viewing of keys via OTP-verified endpoint.
- Rotation immediately invalidates all previous keys.

### 3. Encryption Details

| Data             | Method          | Reversible? | Purpose                        |
| ---------------- | --------------- | ----------- | ------------------------------ |
| User Passwords   | Argon2 Hashing  | No          | Secure login verification      |
| API Secrets      | AES-256-GCM     | Yes         | Encrypted storage + OTP view   |
| OTP Codes        | SHA-256 Hash    | No          | One-time verification          |
| Refresh Tokens   | SHA-256 Hash    | No          | Token revocation tracking      |
| Webhook Payloads | HMAC-SHA256     | N/A         | Payload signature verification |

---

## WhatsApp Session Lifecycle

```
   User clicks            System generates        User scans QR
  "Link Device"  ──────▶  QR Code (SSE)  ──────▶  with WhatsApp
                                                        │
                                                        ▼
                                              OTP sent to the
                                              connected number
                                                        │
                          Session Status:               ▼
                          CONNECTED ◀──── User verifies OTP
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              Network Drop         User Disconnects
              (Auto-Reconnect       (Session Destroyed,
               without OTP)         OTP required on
                                    next QR scan)
```

### Session States

| Status                 | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `connecting`           | WhatsApp server connection in progress                    |
| `pending_verification` | QR scanned, waiting for OTP verification                  |
| `connected`            | Fully active — can send/receive messages                  |
| `disconnected`         | Temporary network drop — auto-reconnect will be attempted |
| `destroyed`            | Permanently removed — requires fresh QR + OTP             |

### QR Code Behavior
- Each QR code expires after **20 seconds**.
- System generates up to **5 QR codes** sequentially.
- If none are scanned within ~100 seconds, session is marked `disconnected`.
- QR codes are streamed to the frontend in real-time via **SSE (Server-Sent Events)**.

---

## Queue System (pg-boss)

All outbound messages are processed asynchronously through **pg-boss**, a PostgreSQL-backed job queue.

### Why a Queue?
1. **Rate Limiting:** Prevents mass-sending that would trigger WhatsApp's spam detection.
2. **Reliability:** If a message fails, it can be retried automatically.
3. **Scalability:** Thousands of messages can be queued without blocking the API response.
4. **Async Response:** API returns `202 Accepted` immediately — delivery happens in the background.

### Queue Architecture
```
API Request ──▶ Message saved to DB ──▶ Job pushed to pg-boss
                    (status: queued)         │
                                             ▼
                                    Background Worker picks job
                                             │
                                             ▼
                                    Baileys sends via WhatsApp
                                             │
                                    ┌────────┴────────┐
                                    ▼                 ▼
                              Success              Failure
                           (status: sent)      (status: failed)
                                                 (auto-retry)
```

### pg-boss Tables (in `pgboss` schema)
| Table          | Purpose                                    |
| -------------- | ------------------------------------------ |
| `job`          | Active and pending jobs                    |
| `job_common`   | Shared job configuration                   |
| `queue`        | Registered queue names                     |
| `schedule`     | Cron/recurring jobs                        |
| `subscription` | Pub/sub listeners                          |
| `bam`          | Archived completed jobs (Boss Archive Mgr) |
| `version`      | pg-boss schema version tracking            |
| `warning`      | System warnings and alerts                 |

### Configuration
| Variable                | Default  | Description                                 |
| ----------------------- | -------- | ------------------------------------------- |
| `QUEUE_SCHEMA`          | `pgboss` | Separate PostgreSQL schema for queue tables  |
| `QUEUE_MONITOR_INTERVAL`| `30`     | Health check interval (seconds)             |
| `QUEUE_ARCHIVE_AFTER`   | `43200`  | Move completed jobs to archive after 12 hrs |
| `QUEUE_DELETE_AFTER`    | `604800` | Delete archived jobs after 7 days           |

---

## Webhook System

Tenants can register a webhook URL to receive real-time event notifications when messages are sent, delivered, read, or failed.

### How It Works
1. Tenant registers a webhook URL via `POST /api/webhooks/register`.
2. When a message event occurs, the backend dispatches a POST request to the registered URL.
3. The payload is signed with **HMAC-SHA256** so the tenant can verify authenticity.
4. Delivery attempts are logged in `webhook_delivery_logs` with response codes.

---

## Environment Variables

Create a `.env` file in the project root. See `.env.example` for all available options:

```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:3001,http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=whatsapp_saas
DB_SYNCHRONIZE=false

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AES Encryption Key (64 hex chars = 32 bytes)
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# WhatsApp / Baileys
WA_MAX_QR_ATTEMPTS=5
WA_RECONNECT_MAX_RETRIES=10

# Queue (pg-boss)
QUEUE_SCHEMA=pgboss
QUEUE_MONITOR_INTERVAL=30
QUEUE_ARCHIVE_AFTER=43200
QUEUE_DELETE_AFTER=604800

# OTP
OTP_EXPIRY_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_LENGTH=6
```

---

## Setup & Installation

### Prerequisites
- **Node.js** v18+ (v20+ recommended)
- **PostgreSQL** v14+
- **npm** v9+

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd message_platform

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your database credentials and secrets

# 4. Generate an encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add the output to ENCRYPTION_KEY in .env

# 5. Create the database
# In PostgreSQL:
# CREATE DATABASE whatsapp_saas;

# 6. Run migrations
npm run migration:run
```

---

## Running the Project

```bash
# Development (watch mode with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

Once running, access:
- **API:** `http://localhost:3000/api`
- **Swagger Docs:** `http://localhost:3000/docs`

---

## Migrations

The project uses TypeORM migrations for database schema management.

```bash
# Run all pending migrations
npm run migration:run

# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Revert the last migration
npm run migration:revert
```


## 📄 License

This project is proprietary software. All rights reserved.
