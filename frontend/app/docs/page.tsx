import Link from "next/link";
import { ArrowRight, BookOpen, KeyRound, Layers3, MessageCircle, ShieldCheck } from "lucide-react";
import { docsArticles, docsGroups } from "@/lib/docs-content";
import { DocsToc } from "@/components/docs-toc";

export const metadata = {
  title: "Developer documentation",
  description: "Understand what Nexora solves, when to use it, and how to build WhatsApp workflows with its API.",
};

export default function DocsHome() {
  return (
    <div className="docs-article">
      <DocsToc sections={[{ id: "what-is-nexora", title: "What is Nexora?" }, { id: "the-problem", title: "The problem" }, { id: "how-nexora-works", title: "How it works" }, { id: "use-cases", title: "Use cases" }, { id: "benefits", title: "Benefits" }, { id: "choose-a-path", title: "Choose a path" }]} />
      <div className="docs-eyebrow"><BookOpen className="h-4 w-4" /> Developer documentation</div>
      <h1>WhatsApp workflows, without rebuilding the infrastructure.</h1>
      <p className="docs-lead">Nexora is a self-hosted WhatsApp API gateway. Connect a number by scanning a QR code, then let your CRM, booking system, or other backend send messages and receive events through REST APIs and webhooks.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/docs/why-nexora" className="docs-primary-link">Understand the product <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/docs/quickstart" className="docs-secondary-link">Start the quickstart</Link>
      </div>
      <section id="what-is-nexora" className="docs-section">
        <h2>What is Nexora?</h2>
        <p>It is the connection layer between your application and a linked WhatsApp account. Instead of building WhatsApp Web session handling, API credentials, message jobs, and webhooks yourself, you run Nexora and integrate with its API. Each organization has its own tenant and linked session.</p>
      </section>
      <section id="the-problem" className="docs-section">
        <h2>Why does this exist?</h2>
        <p>A single WhatsApp API request is the easy part. In a real product, you also need to keep numbers connected, separate organizations, protect secrets, handle spikes in sending, and know whether a message was only queued or actually delivered. Nexora gives those pieces a shared foundation.</p>
        <div className="docs-problem-grid">
          <div><span>01 / Connection</span><strong>Keep a number usable</strong><p>QR pairing, verification, reconnects, and session status live in one place.</p></div>
          <div><span>02 / Delivery</span><strong>Know what happened</strong><p>Queue-backed sends, message records, and signed webhook events provide a trail.</p></div>
          <div><span>03 / Scale</span><strong>Separate every workspace</strong><p>Each tenant gets its own credentials, session, and message history.</p></div>
        </div>
        <Link href="/docs/why-nexora" className="docs-inline-link">Read who Nexora is for—and its tradeoffs <ArrowRight className="h-4 w-4" /></Link>
      </section>
      <section id="how-nexora-works" className="docs-section">
        <h2>From connected number to useful workflow</h2>
        <p>Provision a tenant, link its WhatsApp number, and call the messaging API from your server. Nexora queues the message, keeps its status, and sends events to your webhook. Query message and session endpoints to inspect the flow.</p>
        <div className="docs-flow" aria-label="Nexora workflow"><span>Your application</span><ArrowRight className="h-4 w-4" /><span>Nexora API + queue</span><ArrowRight className="h-4 w-4" /><span>Linked WhatsApp</span><ArrowRight className="h-4 w-4" /><span>Customer</span></div>
      </section>
      <section id="use-cases" className="docs-section">
        <h2>What can you use it for?</h2>
        <p>Connect WhatsApp to workflows your product already owns. Nexora handles the connection and messaging layer; your application decides the business rules.</p>
        <div className="docs-problem-grid">
          <div><span>Appointments</span><strong>Confirm a booking</strong><p>Send confirmations or reminders when your scheduling system creates an appointment.</p></div>
          <div><span>Commerce</span><strong>Update an order</strong><p>Trigger delivery or transaction updates from your CRM or ERP.</p></div>
          <div><span>Support</span><strong>Handle incoming messages</strong><p>Receive inbound events through a webhook and route them into your support workflow.</p></div>
        </div>
      </section>
      <section id="benefits" className="docs-section">
        <h2>Why would you use it?</h2>
        <p>One integration gives developers QR/session management, tenant-scoped credentials, queue-backed sending, message status records, and signed webhooks. Self-hosting gives your team control of the deployment and data. It is not Meta's official API: WhatsApp Web automation has reliability and account-restriction risks, and hosting still costs money.</p>
        <Link href="/docs/why-nexora#cost-and-tradeoffs" className="docs-inline-link">Understand the costs and tradeoffs <ArrowRight className="h-4 w-4" /></Link>
      </section>
      <div className="docs-callout mt-12"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Choose the right credential</strong><p>Session and dashboard calls use a Bearer token. Messaging calls and webhook registration use tenant API credentials. Keep all secrets off the client.</p></div></div>
      <section id="choose-a-path" className="docs-section">
        <h2>Choose a path</h2><p>Start with a working local API, then jump directly to the workflow you are building.</p>
        <div className="docs-card-grid">
          <Link href="/docs/quickstart" className="docs-card"><Layers3 className="h-5 w-5" /><strong>Set up locally</strong><span>Configure PostgreSQL and make your first request.</span><ArrowRight className="docs-card-arrow h-4 w-4" /></Link>
          <Link href="/docs/sessions" className="docs-card"><MessageCircle className="h-5 w-5" /><strong>Connect WhatsApp</strong><span>Pair a device, verify the OTP and check status.</span><ArrowRight className="docs-card-arrow h-4 w-4" /></Link>
          <Link href="/docs/messaging" className="docs-card"><KeyRound className="h-5 w-5" /><strong>Send messages</strong><span>Use the API key pair to queue and inspect delivery.</span><ArrowRight className="docs-card-arrow h-4 w-4" /></Link>
        </div>
      </section>
      {docsGroups.map((group) => <section id={group.toLowerCase().replaceAll(" ", "-")} className="docs-section" key={group}><h2>{group}</h2><div className="docs-link-list">{docsArticles.filter((article) => article.group === group).map((article) => <Link href={`/docs/${article.slug}`} key={article.slug}><span><strong>{article.title}</strong><small>{article.description}</small></span><ArrowRight className="h-4 w-4" /></Link>)}</div></section>)}
    </div>
  );
}
