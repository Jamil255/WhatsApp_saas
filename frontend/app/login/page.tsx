'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/lib/api';

const benefits = [
  'Shared inbox for your whole team',
  'Reliable messaging and delivery visibility',
  'Workspace-level access and audit history',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'access-restricted') {
      setError(
        'Your session ended because the organization or its subscription is inactive. Contact the platform administrator to restore access.',
      );
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      router.push(
        result.user.role === 'super_admin' ? '/admin/dashboard' : '/dashboard',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8f5] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#0b1f18] text-white lg:block">
        <div className="public-grid absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(65,175,106,.24),transparent_32%),radial-gradient(circle_at_12%_84%,rgba(183,239,134,.10),transparent_28%)]" />
        <div className="relative flex min-h-screen flex-col justify-between p-10 xl:p-14">
          <Logo dark />
          <div className="max-w-xl pb-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-lime">
              <MessageCircle className="h-3.5 w-3.5" />
              Workspace access
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[.98] tracking-[-.07em] text-white xl:text-6xl">
              Your team&apos;s best conversations start here.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
              Connect WhatsApp, bring your people together, and turn every reply
              into momentum.
            </p>
            <div className="mt-10 space-y-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-2.5 text-sm text-white/70"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime/15 text-lime">
                    <Check className="h-3 w-3" />
                  </span>
                  {benefit}
                </div>
              ))}
            </div>
            <div className="mt-12 flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-white/40">
              <ShieldCheck className="h-4 w-4 text-lime" />
              Secure workspace boundaries, built into the workflow.
            </div>
          </div>
          <p className="text-xs text-white/30">
            Copyright 2026 Nexora · Open messaging infrastructure.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8 lg:hidden">
          <Logo />
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground"
          >
            Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10 sm:px-8">
          <Link
            href="/"
            className="mb-10 hidden items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-ink lg:flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-35px_rgba(13,45,40,.35)] sm:p-9">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="mt-7 font-display text-3xl font-extrabold tracking-[-.06em] text-ink">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sign in to your Nexora workspace.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-bold text-ink"
                >
                  Work email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-bold text-ink"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-medium leading-5 text-red-700"
                >
                  {error}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign in to workspace <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            <div className="mt-7 border-t border-slate-100 pt-5 text-xs leading-5 text-muted-foreground">
              Need access to a workspace? Ask your organization admin for an
              invitation.
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Nexora is self-hosted friendly and built for teams that want
            control.
          </p>
        </div>
      </section>
    </main>
  );
}
