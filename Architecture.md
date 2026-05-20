# WhatsApp SaaS Platform — System Architecture & Flowcharts

## SECTION 1 — High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        DA["Dashboard (Browser)"]
        TA["Tenant App (External Server)"]
    end

    subgraph "API Gateway Layer"
        NJ["NestJS API Server :3000"]
        SW["Swagger Docs /docs"]
    end

    subgraph "Auth Layer"
        JWT["JWT Guard (Dashboard)"]
        AKG["API Key Guard (Messaging)"]
        RG["Roles Guard"]
        RLG["Rate Limit Guard"]
        ASG["Active Session Guard"]
    end

    subgraph "Business Logic"
        AC["Auth Controller"]
        TC["Tenant Controller"]
        SC["Session Controller"]
        MC["Messaging Controller"]
        WC["Webhook Controller"]
    end

    subgraph "Queue Layer"
        PGB["pg-boss (PostgreSQL Queue)"]
        MW["Message Worker"]
        WW["Webhook Worker"]
    end

    subgraph "WhatsApp Layer"
        SLS["Session Lifecycle Service"]
        SMS["Session Manager (In-Memory Map)"]
        BAI["Baileys Socket (WebSocket)"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL Database"]
        ENT["15 TypeORM Entities"]
    end

    subgraph "External"
        WA["WhatsApp Servers"]
        TW["Tenant Webhook URL"]
    end

    DA -->|"Bearer Token"| JWT
    TA -->|"X-Client-Id + X-Api-Secret"| AKG

    JWT --> AC & TC & SC
    AKG --> MC & WC

    AC --> PG
    TC --> PG
    SC --> SLS
    MC -->|"Enqueue"| PGB
    WC --> PG

    SLS --> SMS
    SMS --> BAI
    BAI <-->|"WebSocket"| WA

    PGB --> MW & WW
    MW --> SMS
    MW -->|"message.sent"| WW
    WW -->|"POST + HMAC"| TW

    SLS --> PG
    MW --> PG
    WW --> PG
```

---

## SECTION 2 — User Flows

### Flow 1: Super Admin — Create Tenant

```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant API as NestJS API
    participant JG as JWT Guard
    participant RG as Roles Guard
    participant TS as Tenant Service
    participant AKS as API Key Service
    participant DB as PostgreSQL
    participant AL as Audit Log

    SA->>API: POST /api/tenants (Bearer Token)
    API->>JG: Validate JWT
    JG-->>API: User { role: super_admin }
    API->>RG: Check role === super_admin
    RG-->>API: Allowed ✅

    API->>TS: create(dto)
    TS->>DB: INSERT INTO tenants (companyName, slug, plan)
    DB-->>TS: tenant { id: uuid }

    TS->>DB: INSERT INTO users (name, email, password, tenantId)
    Note over TS,DB: Password hashed with Argon2

    TS->>AKS: generateKeyPair(tenantId)
    AKS->>DB: INSERT INTO api_credentials (clientId, apiSecretHash)
    Note over AKS,DB: Secret encrypted with AES-256-GCM

    TS-->>API: { tenant, user, apiKeys }
    API->>AL: log(tenant.create)
    API-->>SA: 201 Created
```

### Flow 2: Tenant Onboarding — QR Scan + OTP Verification

```mermaid
sequenceDiagram
    participant U as Tenant Admin
    participant FE as Frontend/Dashboard
    participant API as NestJS API
    participant SLS as SessionLifecycleService
    participant ASS as AuthStateService
    participant BAI as Baileys Socket
    participant WA as WhatsApp Servers
    participant SSE as QR Event SSE
    participant DB as PostgreSQL

    U->>API: POST /api/sessions/connect
    API->>SLS: connect(tenantId)

    SLS->>DB: UPSERT whatsapp_sessions (status: connecting)
    SLS->>ASS: getAuthState(tenantId)
    ASS->>DB: SELECT creds FROM whatsapp_sessions
    ASS->>DB: SELECT keys FROM whatsapp_session_keys
    ASS-->>SLS: { state, saveCreds }

    SLS->>BAI: makeWASocket({ auth: state })
    BAI->>WA: WebSocket connection opened

    Note over BAI,WA: WhatsApp sends QR data (valid 20 sec)

    loop Max 5 QR Attempts
        WA-->>BAI: QR raw data
        BAI-->>SLS: connection.update { qr: "..." }
        SLS->>DB: UPSERT qr_sessions (qrData, expiresAt)
        SLS->>SSE: emit(tenantId, { qrCode: base64Image })
        SSE-->>FE: SSE Event: qr_update
        FE-->>U: Display QR Code on screen
    end

    U->>U: Scans QR with WhatsApp App

    WA-->>BAI: connection.update { connection: "open" }
    BAI-->>SLS: handleConnectionUpdate()

    SLS->>DB: Check existingSession.phoneNumber
    Note over SLS,DB: phoneNumber is NULL (fresh scan)

    SLS->>DB: UPDATE status = pending_verification
    SLS->>SLS: sendSessionOtp(tenantId, phone, sock)
    SLS->>DB: INSERT otp_verifications (otpHash, expiresAt)
    SLS->>BAI: sock.sendMessage(phone, "OTP: 123456")
    BAI->>WA: Send OTP via WhatsApp
    WA-->>U: OTP received on WhatsApp

    SLS->>SSE: emit(tenantId, { event: otp_required })
    SSE-->>FE: Show OTP input field

    U->>API: POST /api/sessions/verify-otp { otp: "123456" }
    API->>SLS: verifySessionOtp(tenantId, otp)
    SLS->>DB: SELECT otp WHERE tenantId AND !isUsed AND !expired
    SLS->>SLS: Compare SHA-256 hashes
    SLS->>DB: UPDATE otp (isUsed: true)
    SLS->>DB: UPDATE session (status: connected)
    SLS->>SSE: emit(tenantId, { event: verified })
    SSE-->>FE: Show "Connected ✅"
    API-->>U: { status: connected, phoneNumber: +92xxx }
```

### Flow 3: API Message Sending — Complete Lifecycle

```mermaid
sequenceDiagram
    participant TA as Tenant App
    participant API as NestJS API
    participant AKG as ApiKeyGuard
    participant ASG as ActiveSessionGuard
    participant RLG as RateLimitGuard
    participant MS as MessageService
    participant DB as PostgreSQL
    participant PGB as pg-boss Queue
    participant MW as MessageWorker
    participant SM as SessionManager
    participant BAI as Baileys Socket
    participant WA as WhatsApp Servers
    participant WS as WebhookService
    participant TW as Tenant Webhook URL

    TA->>API: POST /api/messaging/send-message
    Note over TA,API: Headers: X-Client-Id, X-Api-Secret

    API->>AKG: Validate API Keys
    AKG->>DB: SELECT FROM api_credentials WHERE clientId
    AKG->>AKG: decryptAES(apiSecretHash) === apiSecret?
    AKG-->>API: tenantId attached to request ✅

    API->>ASG: Check active WhatsApp session
    ASG->>DB: SELECT FROM whatsapp_sessions WHERE tenantId AND status=connected
    ASG-->>API: Session active ✅

    API->>RLG: Check rate limit for tenant
    RLG-->>API: Within limits ✅

    API->>MS: sendMessage(tenantId, dto)
    MS->>DB: INSERT INTO messages (status: queued, queuedAt: now)
    MS->>DB: INSERT INTO message_status_logs (status: queued)
    MS->>PGB: enqueue("message.send", { messageId, tenantId })
    MS-->>API: { id: msg-uuid, status: queued }
    API-->>TA: 201 Created (IMMEDIATE RESPONSE)

    Note over PGB,MW: Background Processing Starts

    PGB-->>MW: Job picked up by worker
    MW->>DB: SELECT message WHERE id = messageId
    MW->>DB: UPDATE status = processing
    MW->>SM: sessionManager.get(tenantId)
    SM-->>MW: Baileys socket instance

    MW->>BAI: sock.sendMessage(jid, { text: body })
    BAI->>WA: Send via WebSocket protocol
    WA-->>BAI: { key: { id: waMessageId } }

    MW->>DB: UPDATE message (status: sent, waMessageId)
    MW->>DB: INSERT message_status_logs (status: sent)

    MW->>WS: dispatch(tenantId, "message.sent", data)
    WS->>DB: SELECT webhook WHERE tenantId AND isActive
    WS->>PGB: enqueue("webhook.dispatch", { webhookId })

    PGB-->>WS: Webhook worker picks job
    WS->>WS: createHmacSignature(payload, secret)
    WS->>TW: POST payload + X-Webhook-Signature header
    TW-->>WS: 200 OK
    WS->>DB: INSERT webhook_delivery_logs (success: true)

    Note over WA,BAI: Later... WhatsApp sends delivery receipt

    WA-->>BAI: messages.update { status: 3 (delivered) }
    BAI-->>PGB: enqueue("message.status.update")
    PGB-->>MW: Worker processes status update
    MW->>DB: UPDATE message (status: delivered, deliveredAt)
    MW->>WS: dispatch(tenantId, "message.delivered")
    WS->>TW: POST delivery notification
```

### Flow 4: Incoming Message Flow

```mermaid
sequenceDiagram
    participant WU as WhatsApp User
    participant WA as WhatsApp Servers
    participant BAI as Baileys Socket
    participant SLS as SessionLifecycleService
    participant PGB as pg-boss Queue
    participant MW as MessageWorker
    participant DB as PostgreSQL
    participant WS as WebhookService
    participant TW as Tenant Webhook URL

    WU->>WA: Sends "Hello" to tenant's number
    WA->>BAI: messages.upsert event (type: notify)

    BAI-->>SLS: sock.ev.on("messages.upsert")
    SLS->>PGB: enqueue("incoming.message", { tenantId, messages })

    PGB-->>MW: processIncoming(data)
    MW->>MW: Extract from, body from message object
    Note over MW: body = conversation || extendedTextMessage || imageCaption || "[media]"

    MW->>DB: INSERT INTO messages (direction: inbound, status: delivered)
    MW->>WS: dispatch(tenantId, "message.incoming", { from, body })
    WS->>PGB: enqueue("webhook.dispatch")
    PGB-->>WS: executeDispatch()
    WS->>TW: POST { event: "message.incoming", data: { from, body } }
    TW-->>WS: 200 OK

    Note over TW: Tenant processes incoming message in their app
```

### Flow 5: Session Reconnect & Disconnect

```mermaid
flowchart TD
    A["Connection Lost"] --> B{"What caused it?"}

    B -->|"Network Drop / Timeout"| C["shouldReconnect = true"]
    B -->|"Logged Out / Forbidden"| D["shouldReconnect = false"]

    C --> E["Increment reconnectCount"]
    E --> F{"reconnectCount <= maxRetries (10)?"}

    F -->|"Yes"| G["Calculate exponential backoff delay"]
    G --> H["setTimeout → connect(tenantId)"]
    H --> I{"Connection successful?"}
    I -->|"Yes"| J["Check: Has phoneNumber & connectedAt?"]

    J -->|"Yes (Auto-reconnect)"| K["Status: CONNECTED\n(Skip OTP)"]
    J -->|"No (Fresh scan)"| L["Status: PENDING_VERIFICATION\n(Require OTP)"]

    I -->|"No"| E

    F -->|"No (Max retries exceeded)"| M["Status: DISCONNECTED\nStop retrying"]

    D --> N["destroySession(tenantId)"]
    N --> O["Delete from SessionManager"]
    N --> P["Clear auth state (encryption keys)"]
    N --> Q["Set phoneNumber = NULL\nconnectedAt = NULL\naccountInfo = NULL"]
    N --> R["Status: DESTROYED"]
    R --> S["Next connect requires\nfresh QR + OTP ✅"]

    style K fill:#22c55e,color:#fff
    style L fill:#f59e0b,color:#fff
    style M fill:#ef4444,color:#fff
    style R fill:#ef4444,color:#fff
    style S fill:#3b82f6,color:#fff
```

---

## SECTION 3 — NestJS Request Lifecycle

Every HTTP request passes through this pipeline:

```mermaid
flowchart LR
    A["HTTP Request"] --> B["Helmet\n(Security Headers)"]
    B --> C["CORS\n(Origin Check)"]
    C --> D["Global Prefix\n(/api/)"]
    D --> E["LoggingInterceptor\n(Log request start)"]
    E --> F["TimeoutInterceptor\n(30s max)"]
    F --> G["Guards"]

    subgraph Guards["Guard Layer (Authentication & Authorization)"]
        G1["JwtAuthGuard\n(Bearer Token)"]
        G2["ApiKeyGuard\n(X-Client-Id + Secret)"]
        G3["RolesGuard\n(super_admin check)"]
        G4["ActiveSessionGuard\n(WhatsApp connected?)"]
        G5["RateLimitGuard\n(Per-tenant throttle)"]
    end

    G --> H["ValidationPipe"]
    H --> I["Controller Method"]
    I --> J["Service Layer"]
    J --> K["Repository / TypeORM"]
    K --> L["PostgreSQL"]

    L --> M["Response Data"]
    M --> N["ResponseTransformInterceptor"]
    N --> O["Wrap in { success, data, meta }"]
    O --> P["HTTP Response"]

    style G1 fill:#3b82f6,color:#fff
    style G2 fill:#8b5cf6,color:#fff
    style G3 fill:#f59e0b,color:#fff
    style G4 fill:#22c55e,color:#fff
    style G5 fill:#ef4444,color:#fff
```

### Guard Decision Matrix

```mermaid
flowchart TD
    R["Incoming Request"] --> T{"Which endpoint?"}

    T -->|"/auth/login\n/auth/otp/*"| NO["No Guard\n(Public endpoint)"]
    T -->|"/tenants/*\n/sessions/*"| JWT["JwtAuthGuard"]
    T -->|"/messaging/*\n/webhooks/register"| AK["ApiKeyGuard"]

    JWT --> RC{"Role check needed?"}
    RC -->|"/tenants (CRUD)"| RG["RolesGuard\n(super_admin only)"]
    RC -->|"/sessions/*"| PASS1["Pass ✅"]

    AK --> AS["ActiveSessionGuard\n(Is WhatsApp connected?)"]
    AS --> RL["RateLimitGuard\n(Within quota?)"]
    RL --> PASS2["Pass ✅"]

    RG --> PASS3["Pass ✅"]

    style NO fill:#6b7280,color:#fff
    style JWT fill:#3b82f6,color:#fff
    style AK fill:#8b5cf6,color:#fff
    style RG fill:#f59e0b,color:#fff
    style AS fill:#22c55e,color:#fff
    style RL fill:#ef4444,color:#fff
```

## SECTION 4 — Database Entity Relationships

```mermaid
erDiagram
    tenants ||--o{ users : "has many"
    tenants ||--o| whatsapp_sessions : "has one"
    tenants ||--o| api_credentials : "has one active"
    tenants ||--o{ messages : "has many"
    tenants ||--o| webhooks : "has one"
    tenants ||--o{ audit_logs : "has many"
    tenants ||--o{ templates : "has many"

    whatsapp_sessions ||--o{ whatsapp_session_keys : "has many"
    whatsapp_sessions ||--o{ qr_sessions : "has one"
    whatsapp_sessions ||--o{ otp_verifications : "has many"

    messages ||--o{ message_status_logs : "has many"

    webhooks ||--o{ webhook_delivery_logs : "has many"

    users ||--o{ refresh_tokens : "has many"

    tenants {
        uuid id PK
        string companyName
        string slug UK
        enum status "active|suspended"
        string plan
        int rateLimitPerMinute
        int rateLimitPerDay
    }

    users {
        uuid id PK
        uuid tenantId FK
        string email UK
        string name
        string passwordHash "Argon2"
        string phoneNumber
        enum role "super_admin|admin|user"
        boolean isActive
    }

    api_credentials {
        uuid id PK
        uuid tenantId FK
        string clientId UK "cli_xxx"
        string apiSecretHash "AES-256-GCM encrypted"
        string apiSecretPrefix "First 8 chars"
        boolean isActive
        timestamp lastUsedAt
    }

    whatsapp_sessions {
        uuid id PK
        uuid tenantId FK
        enum status "connecting|pending|connected|disconnected|destroyed"
        string phoneNumber
        jsonb creds "Baileys auth credentials"
        jsonb accountInfo
        int reconnectCount
        timestamp connectedAt
        timestamp disconnectedAt
    }

    whatsapp_session_keys {
        uuid id PK
        uuid sessionId FK
        string category "pre-key|sender-key|session|app-state"
        string keyId
        jsonb keyData "Encryption keys"
    }

    messages {
        uuid id PK
        uuid tenantId FK
        string toNumber
        string fromNumber
        string body
        enum messageType "text|otp|image|video|document|audio|template"
        enum direction "outbound|inbound"
        enum status "queued|processing|sent|delivered|read|failed"
        string whatsappMessageId
        uuid templateId FK
        jsonb templateVariables
        jsonb mediaMetadata
        string batchId
        string errorReason
        timestamp queuedAt
        timestamp sentAt
        timestamp deliveredAt
        timestamp readAt
        timestamp failedAt
    }

    message_status_logs {
        uuid id PK
        uuid messageId FK
        enum status
        string source "api|worker|baileys_event"
        jsonb metadata
        timestamp createdAt
    }

    webhooks {
        uuid id PK
        uuid tenantId FK
        string url
        string secret "For HMAC signing"
        json events "message.sent|delivered|failed|incoming"
        boolean isActive
        int failureCount "Auto-disable at 10"
        timestamp lastSuccessAt
        timestamp lastFailureAt
    }

    webhook_delivery_logs {
        uuid id PK
        uuid webhookId FK
        string eventType
        jsonb payload
        int httpStatus
        boolean success
        string errorMessage
    }
```

### Multi-Tenant Data Isolation

```mermaid
flowchart TD
    REQ["API Request Arrives"] --> AUTH{"Auth Type?"}

    AUTH -->|"Bearer Token"| JWT["JwtAuthGuard extracts\ntenantId from JWT payload"]
    AUTH -->|"API Key"| AK["ApiKeyGuard extracts\ntenantId from api_credentials"]

    JWT --> TID["tenantId attached to req.user"]
    AK --> TID

    TID --> QUERY["Every DB query includes:\nWHERE tenant_id = :tenantId"]

    QUERY --> Q1["SELECT * FROM messages\nWHERE tenant_id = 'abc'"]
    QUERY --> Q2["SELECT * FROM whatsapp_sessions\nWHERE tenant_id = 'abc'"]
    QUERY --> Q3["SELECT * FROM webhooks\nWHERE tenant_id = 'abc'"]

    Q1 --> ISO["Tenant A CANNOT see\nTenant B's data ✅"]
    Q2 --> ISO
    Q3 --> ISO

    style ISO fill:#22c55e,color:#fff
```

---

## SECTION 5 — Queue Architecture

```mermaid
flowchart TB
    subgraph "Job Producers"
        MS["MessageService\n(API call)"]
        SLS["SessionLifecycleService\n(Baileys events)"]
        WS["WebhookService\n(After message sent)"]
    end

    subgraph "pg-boss Queue (PostgreSQL schema: pgboss)"
        Q1["message.send\nRetry: 3x, backoff"]
        Q2["message.bulk\nSingle job, loops internally"]
        Q3["message.status.update\nNo retry"]
        Q4["incoming.message\nNo retry"]
        Q5["webhook.dispatch\nRetry: 3x"]
    end

    subgraph "Job Consumers (MessageWorkerService)"
        W1["processMessage()\nSend via Baileys"]
        W2["processBulk()\nChunk + delay loop"]
        W3["processStatusUpdate()\nMap WhatsApp status codes"]
        W4["processIncoming()\nSave + webhook"]
        W5["executeDispatch()\nHTTP POST + HMAC"]
    end

    MS -->|"enqueue"| Q1
    MS -->|"enqueue"| Q2
    SLS -->|"enqueue"| Q3
    SLS -->|"enqueue"| Q4
    WS -->|"enqueue"| Q5

    Q1 --> W1
    Q2 --> W2
    Q3 --> W3
    Q4 --> W4
    Q5 --> W5

    W1 -->|"On success/fail"| WS
    W2 -->|"Creates individual"| Q1
    W3 -->|"Status change"| WS
    W4 -->|"Incoming msg"| WS
```

### Message Status State Machine

```mermaid
stateDiagram-v2
    [*] --> queued: API receives request
    queued --> processing: Worker picks job
    processing --> sent: Baileys confirms
    processing --> failed: Socket error / timeout
    sent --> delivered: WhatsApp receipt (status: 3)
    delivered --> read: WhatsApp receipt (status: 4)
    failed --> queued: pg-boss auto-retry (max 3)
    failed --> [*]: All retries exhausted

    note right of queued: DB + Queue
    note right of processing: Worker active
    note right of sent: WhatsApp confirmed
    note right of failed: Error logged
```

### Bulk Message Processing

```mermaid
flowchart TD
    A["POST /messaging/send-bulk\n{ recipients: 1000, body, delay: 3000 }"] --> B["MessageService.sendBulk()"]
    B --> C["Enqueue single 'message.bulk' job"]
    C --> D["Worker: processBulk()"]
    D --> E["chunkArray(recipients, 50)\n= 20 chunks of 50"]

    E --> F["Loop: Chunk 1 (50 recipients)"]
    F --> G["For each recipient:"]
    G --> H["1. INSERT message (status: queued)"]
    H --> I["2. Enqueue 'message.send' job"]
    I --> J["3. sleep(3000ms) ← Anti-spam delay"]
    J --> K{"More recipients?"}
    K -->|"Yes"| G
    K -->|"No, next chunk"| L{"More chunks?"}
    L -->|"Yes"| F
    L -->|"No"| M["Bulk complete ✅"]

    style J fill:#f59e0b,color:#fff
    style M fill:#22c55e,color:#fff
```

---

## SECTION 6 — Authentication Architecture

```mermaid
flowchart TD
    subgraph "Dashboard Auth (Human Users)"
        L1["Email + Password Login"] --> V1["Argon2 verify hash"]
        L2["WhatsApp OTP Login"] --> V2["SHA-256 verify hash"]
        V1 --> T1["Issue JWT Access Token (15 min)"]
        V2 --> T1
        T1 --> T2["Issue Refresh Token (7 days)"]
        T2 --> DB1["Store hashed refresh token in DB"]
    end

    subgraph "API Auth (Server-to-Server)"
        L3["X-Client-Id + X-Api-Secret\nin HTTP Headers"] --> V3["ApiKeyGuard"]
        V3 --> D1["SELECT FROM api_credentials\nWHERE clientId"]
        D1 --> D2["decryptAES(apiSecretHash, ENCRYPTION_KEY)"]
        D2 --> D3{"decrypted === provided secret?"}
        D3 -->|"Yes"| D4["Attach tenantId to request ✅"]
        D3 -->|"No"| D5["401 Unauthorized ❌"]
    end

    subgraph "API Key Lifecycle"
        G1["POST /auth/api-keys/rotate"] --> G2["Invalidate old keys\n(isActive: false)"]
        G2 --> G3["Generate new clientId + secret"]
        G3 --> G4["Encrypt with AES-256-GCM"]
        G4 --> G5["Store encrypted in DB"]

        VW1["POST /auth/api-keys/view/request-otp"] --> VW2["Send OTP to phone"]
        VW2 --> VW3["POST /auth/api-keys/view/verify"]
        VW3 --> VW4["Verify OTP"]
        VW4 --> VW5["Decrypt AES → Show clientId + secret"]
    end
```

---

## SECTION 7 — Production Trade-offs

### 1. Why pg-boss (PostgreSQL Queue) instead of Redis/RabbitMQ?

| Factor | pg-boss (Our Choice) | Redis (Bull) | RabbitMQ |
|--------|---------------------|--------------|----------|
| **Extra infra needed** | ❌ No (uses existing PostgreSQL) | ✅ Yes (Redis server) | ✅ Yes (RabbitMQ server) |
| **Transactional safety** | ✅ Same DB transaction | ❌ Separate system | ❌ Separate system |
| **Persistence** | ✅ Disk-backed | ⚠️ Memory (can lose data) | ✅ Disk-backed |
| **Throughput** | ~1,000 jobs/sec | ~10,000 jobs/sec | ~5,000 jobs/sec |
| **Complexity** | Low | Medium | High |

> **Why this design?** For a WhatsApp SaaS, throughput of 1,000 msgs/sec is MORE than enough (WhatsApp bans above ~50 msgs/min anyway). Using pg-boss means zero extra infrastructure and atomic transactions with our message table.

> **When to switch?** If you scale beyond 50+ concurrent tenants each sending 1,000+ messages simultaneously, migrate to Redis + Bull.

### 2. Why Baileys instead of Meta Official API?

| Factor | Baileys (Our Choice) | Meta Cloud API |
|--------|---------------------|----------------|
| **Cost** | Free | $0.04-$0.08 per conversation |
| **Setup** | QR scan (2 minutes) | Business verification (2-4 weeks) |
| **Templates** | No approval needed | Every template needs Meta approval |
| **Rate limits** | Enforced by us (queue) | Enforced by Meta |

### 3. Why AES-256 for API Secrets instead of Argon2?

| Factor | AES-256-GCM (Our Choice) | Argon2 (Previous) |
|--------|-------------------------|-------------------|
| **Reversible** | ✅ Yes (can decrypt) | ❌ No (one-way hash) |
| **View API keys** | ✅ Possible after OTP | ❌ Impossible |
| **Security at rest** | ✅ Encrypted | ✅ Hashed |
| **Key dependency** | ⚠️ ENCRYPTION_KEY env var | None |

> **Trade-off:** We chose AES so tenants can VIEW their keys via OTP verification. If ENCRYPTION_KEY is lost, ALL API secrets become irrecoverable. Must be stored in a secure vault (AWS Secrets Manager / HashiCorp Vault).

### 4. Why Store Baileys Auth in PostgreSQL instead of Files?

| Factor | PostgreSQL (Our Choice) | File System |
|--------|------------------------|-------------|
| **Multi-server** | ✅ Shared across instances | ❌ Local only |
| **Backup** | ✅ pg_dump includes it | ⚠️ Separate backup |
| **Recovery** | ✅ DB restore = sessions restore | ❌ Files lost = QR rescan |
| **Performance** | ⚠️ JSONB read/write overhead | ✅ Direct file I/O |

> **Trade-off:** Slight performance overhead but essential for horizontal scaling and disaster recovery.

---

## SECTION 8 — Production Engineering Concerns

### 1. Session Security
- Auth credentials stored as **JSONB** in PostgreSQL (encrypted at DB level via PostgreSQL TDE in production).
- Encryption keys (`whatsapp_session_keys`) are device-specific — stealing them without the creds is useless.
- OTP verification on fresh QR scans prevents unauthorized device linking.
- `destroySession()` clears all keys, creds, phoneNumber, and connectedAt.

### 2. Webhook Reliability
```
Attempt 1: POST → Tenant server → Timeout/500
  → Log failure, failureCount = 1

Attempt 2 (pg-boss retry): POST → Tenant server → Timeout
  → failureCount = 2

...continue until...

Attempt 10: failureCount = 10
  → SET isActive = false (auto-disable webhook)
  → No more deliveries until tenant re-registers
```

### 3. Queue Failure Recovery
- `message.send` jobs have `retryLimit: 3, retryDelay: 5000, retryBackoff: true`.
- After 3 retries, message status set to `failed` with `errorReason`.
- pg-boss automatically archives completed jobs after 12 hours (`QUEUE_ARCHIVE_AFTER=43200`).
- Archived jobs deleted after 7 days (`QUEUE_DELETE_AFTER=604800`).

### 4. N+1 Query Prevention
- `ApiKeyGuard` uses `relations: ['tenant']` to eager-load tenant in one query.
- `MessageWorkerService` processes one message per job (no batch loading needed).
- Bulk operations use `chunkArray(recipients, 50)` to prevent memory overflow.

### 5. Horizontal Scaling Challenges

```mermaid
flowchart TD
    A["Current: Single Server"] --> B{"Scale to 2+ servers?"}
    B --> C["Problem 1: SessionManager\nis in-memory Map"]
    B --> D["Problem 2: SSE connections\nare server-specific"]
    B --> E["Problem 3: pg-boss workers\nmay duplicate work"]

    C --> C1["Solution: Redis-backed\nsession registry"]
    D --> D1["Solution: Redis Pub/Sub\nfor SSE fan-out"]
    E --> E1["Solution: pg-boss handles\nthis natively ✅"]

    style C fill:#ef4444,color:#fff
    style D fill:#ef4444,color:#fff
    style E fill:#22c55e,color:#fff
```

> **Key Bottleneck:** `SessionManagerService` stores Baileys sockets in a JavaScript `Map`. This means all WhatsApp connections for all tenants MUST live on the same server. To scale horizontally, you'd need a "sticky session" load balancer or a dedicated WhatsApp gateway service.

### 6. Database Bottlenecks
- **messages table** is the fastest-growing table. Add `created_at` index + partitioning by month for 1M+ rows.
- **whatsapp_session_keys** can grow to 500+ rows per tenant. CASCADE delete on session destroy handles cleanup.
- **webhook_delivery_logs** should be purged periodically (implement a scheduled pg-boss job).

### 7. WhatsApp Disconnect Handling

```mermaid
flowchart TD
    DC["Disconnect Detected"] --> SC{"Status Code?"}

    SC -->|"408 (Timeout)"| RE["Auto-reconnect\nwith backoff"]
    SC -->|"440 (Session Replace)"| RE
    SC -->|"428 (Connection Closed)"| RE

    SC -->|"401 (LoggedOut)"| PERM["Permanent disconnect"]
    SC -->|"403 (Forbidden/Banned)"| PERM
    SC -->|"405 (Multi-device Mismatch)"| PERM

    RE --> REC{"Attempt <= 10?"}
    REC -->|"Yes"| DELAY["Wait: 2s → 4s → 8s → ... → 60s max"]
    DELAY --> CONN["connect(tenantId)"]
    CONN --> SUCCESS{"Connected?"}
    SUCCESS -->|"Yes"| SKIP["Skip OTP\n(auto-reconnect)"]
    SUCCESS -->|"No"| RE

    REC -->|"No"| GIVE["Status: DISCONNECTED\nStop trying"]

    PERM --> DEST["destroySession()\nClear all data"]
    DEST --> FRESH["Next connect =\nFresh QR + OTP required"]

    style SKIP fill:#22c55e,color:#fff
    style GIVE fill:#ef4444,color:#fff
    style FRESH fill:#3b82f6,color:#fff
```

### 8. Rate Limiting Strategy

| Layer | What It Protects | How |
|-------|-----------------|-----|
| **RateLimitGuard** | API endpoint abuse | Per-tenant request count per minute |
| **Bulk delay** | WhatsApp ban prevention | `sleep(batchDelay)` between messages |
| **OTP rate limit** | OTP spam prevention | Max 3 OTPs per phone per 10 minutes |
| **Webhook auto-disable** | Infinite retry loops | Disable after 10 consecutive failures |
| **QR max attempts** | Resource exhaustion | Max 5 QR codes per connect attempt |
| **Reconnect max retries** | CPU/memory exhaustion | Max 10 reconnect attempts |
