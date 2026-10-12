import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  Code2,
  Database,
  Github,
  Layers3,
  MessageCircle,
  Network,
  Radio,
  Send,
  ServerCog,
  ShieldCheck,
  Terminal,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { HeroScene } from '@/components/hero-scene';
import { Logo } from '@/components/logo';
import { PublicNavbar } from '@/components/public-navbar';
import { PublicPricingSection } from '@/components/public-pricing-section';
import { ScrollAnimations } from '@/components/scroll-animations';
import { SecuritySection } from '@/components/security-section';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const repositoryUrl = 'https://github.com/Jamil255/WhatsApp_saas';
const apiSnippet = [
  'curl -X POST https://your-host/api/messaging/send-message \\',
  '  -H "X-Client-Id: $CLIENT_ID" \\',
  '  -H "X-Api-Secret: $API_SECRET" \\',
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"to":"+923001234567","body":"Your order is ready."}\'',
].join('\n');

const principles: Array<{ icon: LucideIcon; title: string; copy: string }> = [
  { icon: Github, title: 'Open source', copy: 'Build in the open' },
  { icon: ServerCog, title: 'Self-hostable', copy: 'Run it your way' },
  { icon: Users, title: 'Team ready', copy: 'One shared workspace' },
  { icon: Code2, title: 'API first', copy: 'Fits your stack' },
];

const useCases: Array<{
  number: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  href: string;
  link: string;
  accent: string;
}> = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Support that feels personal.',
    copy: 'Keep customer conversations and delivery context in one calm place for your team.',
    href: '#features',
    link: 'Explore the workspace',
    accent: 'bg-[#e3f5e8] text-[#117a56]',
  },
  {
    number: '02',
    icon: Network,
    title: 'Operations without guesswork.',
    copy: 'See what was sent, what arrived, and what needs attention before a handoff gets lost.',
    href: '#how-it-works',
    link: 'See how it works',
    accent: 'bg-[#e8f1fa] text-[#3675a9]',
  },
  {
    number: '03',
    icon: Code2,
    title: 'Messaging built into your product.',
    copy: 'Use clear API contracts and events to connect WhatsApp with the tools you already run.',
    href: '#developers',
    link: 'Explore the API',
    accent: 'bg-[#eeeafb] text-[#7355aa]',
  },
];

const capabilities: Array<{
  icon: LucideIcon;
  title: string;
  copy: string;
  items: string[];
}> = [
  {
    icon: Layers3,
    title: 'One workspace',
    copy: 'Everything your team needs to operate together.',
    items: ['Multi-tenant workspaces', 'Team access', 'Session management'],
  },
  {
    icon: Send,
    title: 'Messaging',
    copy: 'Go from conversation to delivery with clarity.',
    items: ['Text and media', 'Templates and broadcasts', 'Delivery status'],
  },
  {
    icon: Zap,
    title: 'Automation',
    copy: 'Connect events to the systems around you.',
    items: ['Webhook events', 'Queue-backed jobs', 'Retry controls'],
  },
  {
    icon: ShieldCheck,
    title: 'Operations',
    copy: 'Stay in control as your workflows grow.',
    items: ['Audit history', 'Health monitoring', 'Scoped credentials'],
  },
];

const architecture: Array<{ icon: LucideIcon; title: string; copy: string }> = [
  {
    icon: Database,
    title: 'Your data',
    copy: 'Workspace and message records stay in the environment you control.',
  },
  {
    icon: Webhook,
    title: 'Your workflows',
    copy: 'Delivery and session events flow back to your existing tools.',
  },
  {
    icon: ServerCog,
    title: 'Your infrastructure',
    copy: 'Run the API and dashboard where your team manages access and uptime.',
  },
];

const stack: Array<{ icon: LucideIcon; name: string; role: string }> = [
  { icon: Layers3, name: 'Next.js 15', role: 'Web app' },
  { icon: Code2, name: 'React 19', role: 'Interface' },
  { icon: Terminal, name: 'TypeScript 5', role: 'Language' },
  { icon: ServerCog, name: 'NestJS 11', role: 'API' },
  { icon: Database, name: 'PostgreSQL', role: 'Data' },
  { icon: Network, name: 'TypeORM', role: 'Persistence' },
  { icon: Zap, name: 'pg-boss', role: 'Queues' },
  { icon: MessageCircle, name: 'Baileys', role: 'WhatsApp connection' },
];

function Eyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={
        light ? 'home-eyebrow text-lime' : 'home-eyebrow text-[#167a54]'
      }
    >
      {children}
    </p>
  );
}

function TextLink({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        light
          ? 'group home-text-link text-lime hover:text-white'
          : 'group home-text-link text-[#0d7654] hover:text-[#07422f]'
      }
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8faf7] text-ink">
      <ScrollAnimations />

      <section className="home-hero relative overflow-hidden bg-[#071a13] text-white">
        <div className="home-hero-pattern pointer-events-none absolute inset-0" />
        <div className="relative z-10">
          <div className="border-b border-white/10 px-5 py-2.5 sm:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-[11px] font-medium text-white/65 sm:justify-between">
              <span className="hidden items-center gap-2 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> OPEN
                SOURCE · SELF-HOSTABLE · BUILT FOR TEAMS
              </span>
              <Link
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 transition hover:text-lime"
              >
                Built in the open <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <PublicNavbar />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[.94fr_1.06fr] lg:gap-10 lg:pb-28 lg:pt-24">
            <div className="min-w-0 max-w-[640px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> The open
                messaging layer
              </div>
              <h1 className="mt-7 font-display text-[clamp(2.7rem,4.8vw,5.2rem)] font-extrabold leading-[1.02] tracking-[-.075em] text-white">
                WhatsApp workflows,{' '}
                <span className="text-lime">finally in your hands.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
                Connect a number, bring your team together, and build messaging
                into your product with an open platform you can operate
                yourself.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-lime px-6 font-bold text-ink shadow-[0_14px_36px_-18px_rgba(183,239,134,.8)] hover:bg-[#c8f5a8]"
                >
                  <Link href="#pricing">
                    View plans &amp; free trials{' '}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold text-white transition hover:border-lime/50 hover:bg-white/5"
                >
                  Explore how it works <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs text-white/60">
                <span className="inline-flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-lime" />
                  Self-hostable
                </span>
                <span className="inline-flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-lime" />
                  Built for teams
                </span>
                <span className="inline-flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-lime" />
                  Developer ready
                </span>
              </div>
            </div>
            <HeroScene />
          </div>
        </div>
      </section>

      <section
        aria-label="Platform principles"
        className="border-b border-[#dfe9e2] bg-white px-5 sm:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map(({ icon: Icon, title, copy }) => (
            <div
              key={title}
              className="flex items-center gap-3 border-b border-[#e9efea] py-5 last:border-0 sm:border-b-0 sm:py-7 lg:border-r lg:pl-7 lg:first:pl-0 lg:last:border-r-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7ef] text-[#147a55]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{title}</p>
                <p className="mt-0.5 text-xs text-[#66796d]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-[850px]">
            <Eyebrow>Ways to use Nexora</Eyebrow>
            <h2 className="home-heading home-section-heading">
              One workspace.
              <span className="block text-[#17835a]">
                Every WhatsApp workflow.
              </span>
            </h2>
            <p className="mt-5 max-w-[640px] text-base leading-7 text-[#566c5e] sm:text-lg sm:leading-8">
              Support customers, coordinate operations, and bring messaging into
              your product from one connected place.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {useCases.map(
              ({ number, icon: Icon, title, copy, href, link, accent }) => (
                <Card
                  key={title}
                  className="group flex min-h-[310px] flex-col rounded-[24px] border-[#e2eae4] bg-[#fbfdfb] p-6 shadow-none transition duration-300 hover:-translate-y-1 hover:border-[#bddac7] hover:shadow-[0_22px_50px_-34px_rgba(20,75,53,.3)] sm:p-7"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={
                        'flex h-12 w-12 items-center justify-center rounded-2xl ' +
                        accent
                      }
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-[#9eaea3]">
                      {number} / 03
                    </span>
                  </div>
                  <h3 className="mt-8 max-w-[270px] font-display text-[23px] font-bold leading-[1.2] tracking-[-.045em] text-ink">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#687a6f]">
                    {copy}
                  </p>
                  <div className="mt-auto pt-7">
                    <TextLink href={href}>{link}</TextLink>
                  </div>
                </Card>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="home-section bg-[#f1f6f1] px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-[740px]">
            <Eyebrow>01 / Platform</Eyebrow>
            <h2 className="home-heading">
              Everything your team needs to{' '}
              <span className="text-[#17835a]">stay connected.</span>
            </h2>
            <p className="home-intro">
              Bring messaging, team work, automation, and developer access into
              one considered workspace.
            </p>
          </div>
          <div className="mt-11 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, copy, items }) => (
              <Card
                key={title}
                className="flex h-full flex-col rounded-[24px] border-[#dfe9e0] bg-white p-6 shadow-[0_10px_32px_-26px_rgba(14,56,38,.28)] transition duration-300 hover:-translate-y-1 hover:border-[#a8d5b6] sm:p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5e9] text-[#177a53]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-7 font-display text-xl font-bold tracking-[-.04em]">
                  {title}
                </h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#687a6f]">
                  {copy}
                </p>
                <ul className="mt-6 space-y-3 border-t border-[#e9eee9] pt-5">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[13px] leading-5 text-[#3e5748]"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#19835a]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="home-section relative overflow-hidden bg-[#0b2118] px-5 py-20 text-white sm:px-8 lg:py-28"
      >
        <div className="home-dark-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.83fr_1.17fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow light>02 / How it works</Eyebrow>
            <h2 className="home-heading text-white">
              The connection layer your stack was{' '}
              <span className="text-lime">missing.</span>
            </h2>
            <p className="home-intro text-white/65">
              Nexora sits between your product and WhatsApp, bringing sessions,
              messaging, delivery, and events into one clear flow.
            </p>
            <div className="mt-8 space-y-5">
              {architecture.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime/15 bg-lime/10 text-lime">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/55">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[.045] p-5 shadow-[0_30px_90px_-40px_rgba(0,0,0,.65)] sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <span className="text-[11px] font-bold uppercase tracking-[.18em] text-white/45">
                A simple, connected flow
              </span>
              <span className="flex items-center gap-2 text-[10px] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                YOUR WORKSPACE
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-[#133528] p-5">
                <Code2 className="h-5 w-5 text-lime" />
                <p className="mt-7 font-display text-base font-bold">
                  Your product
                </p>
                <p className="mt-2 text-xs leading-5 text-white/50">
                  App, CRM, or support workflow
                </p>
              </div>
              <div className="rounded-[20px] border border-lime/25 bg-[#1c4631] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                <Layers3 className="h-5 w-5 text-lime" />
                <p className="mt-7 font-display text-base font-bold">
                  Nexora core
                </p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  Sessions, queues, API, events
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-[#133528] p-5">
                <Radio className="h-5 w-5 text-lime" />
                <p className="mt-7 font-display text-base font-bold">
                  WhatsApp
                </p>
                <p className="mt-2 text-xs leading-5 text-white/50">
                  Connected numbers and replies
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
              {['One operational view', 'Webhook events', 'Scoped access'].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/65"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="developers"
        className="home-section bg-white px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-[720px]">
              <Eyebrow>03 / Developers</Eyebrow>
              <h2 className="home-heading">
                A clean API for{' '}
                <span className="text-[#17835a]">real workflows.</span>
              </h2>
            </div>
            <TextLink href="/docs">Read the documentation</TextLink>
          </div>
          <div className="mt-11 grid overflow-hidden rounded-[28px] border border-[#dce7df] bg-[#f4f8f4] lg:grid-cols-[.82fr_1.18fr]">
            <div className="flex flex-col p-7 sm:p-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dff2e4] text-[#137a53]">
                <Terminal className="h-5 w-5" />
              </span>
              <h3 className="mt-7 max-w-sm font-display text-2xl font-bold leading-tight tracking-[-.045em]">
                Build the experience. Let the platform handle the connection.
              </h3>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#65776b]">
                Use an authenticated REST API, then follow delivery through the
                dashboard and webhook events.
              </p>
              <ul className="mt-7 grid gap-3 text-sm text-[#375243]">
                {[
                  'REST endpoints with clear request shapes',
                  'API credentials per workspace',
                  'Queue-backed message delivery',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#19835a]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <TextLink href="/docs">View API examples</TextLink>
              </div>
            </div>
            <div className="min-w-0 bg-[#071a13] p-4 text-white sm:p-7">
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0b241a]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 sm:px-5">
                  <span className="flex items-center gap-2 text-[11px] font-semibold text-white/65">
                    <span className="rounded bg-lime/15 px-1.5 py-0.5 font-mono text-[10px] text-lime">
                      POST
                    </span>{' '}
                    /api/messaging/send-message
                  </span>
                  <CopyCodeButton value={apiSnippet} />
                </div>
                <div className="p-4 sm:p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[.15em] text-white/35">
                    Request example
                  </p>
                  <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-6 text-[#c8e9d1] sm:text-xs">
                    <code>{apiSnippet}</code>
                  </pre>
                </div>
                <div className="border-t border-white/10 bg-white/[.025] px-4 py-4 sm:px-5">
                  <p className="font-mono text-[10px] uppercase tracking-[.15em] text-white/35">
                    201 Created · response shape
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-emerald-200">
                    {
                      '{ "messageId": "...", "to": "+923001234567", "status": "queued", "queuedAt": "..." }'
                    }
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-white/45">
                Example values shown. Replace the host and credentials with your
                own.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicPricingSection />

      <section
        id="quick-start"
        className="home-section bg-[#f8faf7] px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.87fr_1.13fr] lg:items-center lg:gap-16">
          <div>
            <Eyebrow>05 / Get started</Eyebrow>
            <h2 className="home-heading">
              From first login to{' '}
              <span className="text-[#17835a]">first message.</span>
            </h2>
            <p className="home-intro">
              A short, understandable path for teams and developers. Start in
              the workspace, then connect your product when you are ready.
            </p>
            <div className="mt-8">
              <TextLink href="/docs">Follow the setup guide</TextLink>
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#dfe9e1] bg-white shadow-[0_26px_70px_-45px_rgba(24,72,46,.35)]">
            {[
              {
                number: '01',
                title: 'Create your workspace',
                copy: 'Set up your organization and invite the people who will use it.',
              },
              {
                number: '02',
                title: 'Connect a WhatsApp number',
                copy: 'Pair a number with the guided session connection flow.',
              },
              {
                number: '03',
                title: 'Send and observe',
                copy: 'Start from the team view or API, then follow delivery status.',
              },
            ].map(({ number, title, copy }) => (
              <div
                key={number}
                className="flex gap-5 border-b border-[#e8eee8] p-6 last:border-0 sm:p-7"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f5e9] font-mono text-xs font-bold text-[#0c7951]">
                  {number}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold tracking-[-.025em]">
                    {title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-sm leading-6 text-[#65776b]">
                    {copy}
                  </p>
                </div>
                <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-[#91a69a] sm:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="tech-stack"
        className="home-section bg-[#102a20] px-5 py-20 text-white sm:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-[850px]">
            <Eyebrow light>06 / Under the hood</Eyebrow>
            <h2 className="home-heading home-section-heading text-white">
              Familiar tools.
              <span className="block text-lime">A focused foundation.</span>
            </h2>
            <p className="mt-5 max-w-[640px] text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              A practical stack your team can understand, extend, and operate.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stack.map(({ icon: Icon, name, role }) => (
              <div
                key={name}
                className="group flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/[.045] p-5 transition-colors duration-200 hover:border-lime/30 hover:bg-white/[.075]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime/10 text-lime">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-white">
                    {name}
                  </p>
                  <p className="mt-1 text-xs text-white/45">{role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-xs text-white/55">
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-lime" />
              Typed API
            </span>
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-lime" />
              PostgreSQL-backed jobs
            </span>
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-lime" />
              Self-hostable architecture
            </span>
          </div>
        </div>
      </section>

      <SecuritySection />

      <section
        id="comparison"
        className="home-section bg-[#f1f6f1] px-5 py-20 sm:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-[750px]">
            <Eyebrow>08 / Why Nexora</Eyebrow>
            <h2 className="home-heading">
              The control of building it yourself.{' '}
              <span className="text-[#17835a]">A much shorter path.</span>
            </h2>
            <p className="home-intro">
              Choose the operating model that fits your team. Here is where
              Nexora sits between a hosted service and a custom build.
            </p>
          </div>
          <div className="mt-11 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[25px] border border-[#276348] bg-[#0e2b1e] p-7 text-white shadow-[0_28px_70px_-40px_rgba(14,58,34,.55)] sm:p-8">
              <span className="inline-flex rounded-full bg-lime px-3 py-1 text-[10px] font-bold uppercase tracking-[.15em] text-ink">
                Open + ready to use
              </span>
              <h3 className="mt-7 font-display text-3xl font-extrabold tracking-[-.05em]">
                Nexora
              </h3>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/65">
                For teams that want their own messaging layer with an existing
                workspace, API, and operational tools.
              </p>
              <ul className="mt-7 space-y-3 border-t border-white/10 pt-6">
                {[
                  'Own your deployment',
                  'Shared team workspace',
                  'Scoped developer access',
                  'Delivery visibility',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-white/85"
                  >
                    <CircleCheck className="h-4 w-4 shrink-0 text-lime" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="mt-8 w-full bg-lime text-ink hover:bg-[#c8f5a8]"
              >
                <Link href="/login">
                  Create workspace <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-[25px] border border-[#dce7df] bg-white p-7 sm:p-8">
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7a8e80]">
                Managed option
              </span>
              <h3 className="mt-7 font-display text-3xl font-extrabold tracking-[-.05em]">
                Hosted vendor
              </h3>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#65776b]">
                A fast way to begin when you prefer someone else to run the
                infrastructure.
              </p>
              <ul className="mt-7 space-y-3 border-t border-[#e7eee8] pt-6">
                {[
                  'Managed infrastructure',
                  'Quick initial setup',
                  'Less control over deployment',
                  'Ongoing vendor dependency',
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-[#466052]"
                  >
                    <span
                      className={
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full ' +
                        (index < 2
                          ? 'bg-[#e1f3e8] text-[#188057]'
                          : 'bg-[#f1f4f1] text-[#93a499]')
                      }
                    >
                      {index < 2 ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[25px] border border-[#dce7df] bg-white p-7 sm:p-8">
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7a8e80]">
                Custom option
              </span>
              <h3 className="mt-7 font-display text-3xl font-extrabold tracking-[-.05em]">
                Build alone
              </h3>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#65776b]">
                Full flexibility when you are ready to own every queue,
                dashboard, integration, and failure mode.
              </p>
              <ul className="mt-7 space-y-3 border-t border-[#e7eee8] pt-6">
                {[
                  'Full design freedom',
                  'Complete customization',
                  'More engineering time',
                  'More maintenance to own',
                ].map((item, index) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-[#466052]"
                  >
                    <span
                      className={
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full ' +
                        (index < 2
                          ? 'bg-[#e1f3e8] text-[#188057]'
                          : 'bg-[#f1f4f1] text-[#93a499]')
                      }
                    >
                      {index < 2 ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1f6f1] px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="home-cta relative mx-auto max-w-7xl overflow-hidden rounded-[30px] px-7 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Eyebrow light>Make the connection yours</Eyebrow>
              <h2 className="max-w-[690px] font-display text-4xl font-extrabold leading-[1.06] tracking-[-.06em] sm:text-5xl">
                Bring your team and messaging together.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                Choose a paid plan, use its free trial, connect a number, and
                build the workflow that fits your product.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button
                asChild
                size="lg"
                className="bg-lime px-6 font-bold text-ink hover:bg-[#c8f5a8]"
              >
                <Link href="#pricing">
                  View plans &amp; trials{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer
        id="company"
        className="bg-[#071a13] px-5 py-14 text-white sm:px-8 lg:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.4fr_repeat(3,.7fr)]">
            <div>
              <Logo dark />
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">
                An open connection layer for teams building WhatsApp workflows
                they can operate, observe, and own.
              </p>
              <a
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime transition hover:text-white"
              >
                <Github className="h-4 w-4" />
                GitHub <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.15em] text-white/40">
                Platform
              </p>
              <div className="mt-5 grid gap-3 text-sm text-white/65">
                <Link href="#features" className="hover:text-white">
                  Capabilities
                </Link>
                <Link href="#how-it-works" className="hover:text-white">
                  How it works
                </Link>
                <Link href="#pricing" className="hover:text-white">
                  Plans &amp; pricing
                </Link>
                <Link href="#security" className="hover:text-white">
                  Security
                </Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.15em] text-white/40">
                Developers
              </p>
              <div className="mt-5 grid gap-3 text-sm text-white/65">
                <Link href="#developers" className="hover:text-white">
                  API overview
                </Link>
                <Link href="#tech-stack" className="hover:text-white">
                  Tech stack
                </Link>
                <Link href="/docs" className="hover:text-white">
                  Documentation
                </Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.15em] text-white/40">
                Get started
              </p>
              <div className="mt-5 grid gap-3 text-sm text-white/65">
                <Link href="#quick-start" className="hover:text-white">
                  Quick start
                </Link>
                <Link href="/login" className="hover:text-white">
                  Sign in
                </Link>
                <Link
                  href={repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Source code
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Nexora. Built in the open.</span>
            <span>WhatsApp is a trademark of Meta Platforms, Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
