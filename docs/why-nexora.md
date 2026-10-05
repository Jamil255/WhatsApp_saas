# What is Nexora, and why use it?

Nexora is a self-hosted WhatsApp automation gateway. Each organization (tenant) links one WhatsApp number by scanning a QR code and completing verification. Its own backend can then send messages with Nexora's REST API and receive message events at a signed webhook.

```text
CRM / ERP / booking / support app
             |
        Nexora REST API
             |
    queue + linked WhatsApp Web session
             |
       Customer's WhatsApp
             |
    status and inbound webhooks
```

## The problem

Connecting an app to WhatsApp is not just a send-message call. Teams must manage QR pairing, connection loss, credentials, tenant isolation, message queues, status tracking, incoming messages, and webhook delivery. Building those parts for every application takes time and makes failures harder to diagnose.

Nexora provides this connection layer once so your application can focus on its own business rules.

## Where to use it

- A booking system sends appointment confirmations and reminders.
- A CRM or ERP sends order or transaction updates.
- An authentication flow sends a WhatsApp OTP.
- A support system receives `message.incoming` webhook events and routes them to its agents.
- A multi-organization SaaS provisions separate tenants, API credentials, and linked numbers. The current backend supports one WhatsApp session per tenant.

## Benefits

- **Less integration work:** your app calls a documented API instead of managing WhatsApp Web sockets itself.
- **Clear tenant boundaries:** each organization has its own credentials, session, and message records.
- **Delivery visibility:** queue responses, message status records, session status, and signed webhooks make the flow observable.
- **Deployment control:** inspect the source and operate the API, PostgreSQL database, and pg-boss queue on your infrastructure.

## Costs and limitations

Nexora uses Baileys and the WhatsApp Web protocol. It does **not** make Meta's official Cloud API free or act as an officially supported Business Platform client. Hosting, database, backups, monitoring, and maintenance still cost money. WhatsApp Web changes or account restrictions can interrupt automation, and a queued API response does not guarantee delivery.

Some current dashboard screens display sample data. Use backend status and admin endpoints for live operational information until those screens are connected to the API. If official support, provider SLAs, or approved compliance workflows are mandatory, evaluate Meta's official WhatsApp Business Platform instead.

For implementation, start with the [web documentation](http://localhost:3001/docs), then follow [Getting started](./getting-started.md) and the [API guide](./api.md).
