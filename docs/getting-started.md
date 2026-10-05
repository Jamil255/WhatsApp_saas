# Getting started

## Prerequisites

- Node.js 20 or newer
- npm or Bun
- PostgreSQL 14 or newer
- A WhatsApp account for testing sessions

## 1. Install the repository

```bash
git clone https://github.com/Jamil255/WhatsApp_saas.git
cd WhatsApp_saas
npm install
cd frontend
npm install
cd ..
```

## 2. Configure the API

Copy the root environment template if one is provided in your checkout, then set the database, JWT, WhatsApp, and queue values required by your environment. The API listens on port `3030` in the current local setup.

At minimum, make sure PostgreSQL is available and the database name matches `DB_DATABASE`. The default local database used by the seed and TypeORM configuration is `whatsapp_saas`.

## 3. Start the backend

```bash
npm run start:dev
```

Useful local endpoints:

- API: `http://localhost:3030`
- Health: `http://localhost:3030/health`
- Swagger: `http://localhost:3030/docs`

The backend starts the queue service and message worker as part of the Nest application.

## 4. Start the frontend

```bash
cd frontend
copy .env.example .env.local
npm run dev
```

The Nexora frontend runs at `http://localhost:3001` and uses:

```env
NEXT_PUBLIC_API_URL=http://localhost:3030/api
```

For a production-style local preview:

```bash
npm run build
npm run start
```

## 5. Connect a WhatsApp session

1. Sign in at `/login`.
2. Open **Connect WhatsApp** from the workspace sidebar.
3. Start the connection flow and scan the QR code from WhatsApp Linked Devices.
4. Wait for the session status to become connected.

Never commit session credentials, JWT secrets, API secrets, or database passwords.
