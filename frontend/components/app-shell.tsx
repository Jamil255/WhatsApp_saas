'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  BookOpen,
  Code2,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MousePointer2,
  PanelLeft,
  QrCode,
  ReceiptText,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  UserRoundCog,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@/components/logo';
import { StatusDot } from '@/components/status-dot';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { apiFetch, type AppUser } from '@/lib/api';
import {
  getStoredUser,
  useAdminOverview,
  useSessionStatus,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

type ShellMode = 'workspace' | 'admin';
type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label?: string; items: NavItem[] };

const workspaceGroups: NavGroup[] = [
  { items: [{ label: 'Overview', href: '/dashboard', icon: LayoutDashboard }] },
  {
    label: 'Messaging',
    items: [
      { label: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
      {
        label: 'Broadcasts',
        href: '/dashboard/broadcasts',
        icon: MessageSquare,
      },
      { label: 'Templates', href: '/dashboard/templates', icon: FileText },
    ],
  },
  {
    label: 'Insights & billing',
    items: [
      { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
      {
        label: 'Billing & usage',
        href: '/dashboard/billing',
        icon: ReceiptText,
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        label: 'WhatsApp connection',
        href: '/dashboard/connect',
        icon: Smartphone,
      },
      { label: 'Team', href: '/dashboard/team', icon: Users },
      { label: 'API & webhooks', href: '/dashboard/developer', icon: Code2 },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

const adminGroups: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Customer management',
    items: [
      { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
      {
        label: 'Plans & subscriptions',
        href: '/admin/subscriptions',
        icon: ReceiptText,
      },
      { label: 'Users & admins', href: '/admin/users', icon: UserRoundCog },
      {
        label: 'WhatsApp connections',
        href: '/admin/connections',
        icon: QrCode,
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        label: 'Website visitors',
        href: '/admin/visitors',
        icon: MousePointer2,
      },
      { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'System health', href: '/admin/health', icon: Activity },
      { label: 'Audit logs', href: '/admin/audit-logs', icon: ShieldCheck },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground',
        active && 'bg-slate-100 text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  mode = 'workspace',
}: {
  children: React.ReactNode;
  mode?: ShellMode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = mode === 'admin';
  const groups = isAdmin ? adminGroups : workspaceGroups;
  const session = useSessionStatus(!isAdmin);
  const adminOverview = useAdminOverview(isAdmin);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    const hasToken = Boolean(window.localStorage.getItem('wa_access_token'));
    if (!hasToken || !storedUser) {
      router.replace('/login');
      return;
    }
    if (isAdmin && storedUser.role !== 'super_admin') {
      router.replace('/dashboard');
      return;
    }
    if (!isAdmin && storedUser.role === 'super_admin') {
      router.replace('/admin/dashboard');
      return;
    }
    setUser(storedUser);
    setAuthChecked(true);
  }, [isAdmin, router]);

  const allItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const currentItem = allItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' &&
        item.href !== '/admin/dashboard' &&
        pathname.startsWith(`${item.href}/`)),
  );
  const displayName =
    user?.name || (isAdmin ? 'Platform admin' : 'Workspace member');
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'N';
  const connected = session.data?.status === 'connected';
  const status = isAdmin
    ? adminOverview.data
      ? 'online'
      : adminOverview.isLoading
        ? 'warning'
        : 'offline'
    : connected
      ? 'online'
      : session.isLoading
        ? 'warning'
        : 'offline';
  const statusLabel = isAdmin
    ? adminOverview.data
      ? `${adminOverview.data.activeSessions} active sessions`
      : 'Platform unavailable'
    : connected
      ? 'WhatsApp connected'
      : 'WhatsApp disconnected';

  async function signOut() {
    const refreshToken = window.localStorage.getItem('wa_refresh_token');
    if (refreshToken)
      await apiFetch('/auth/logout', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    window.localStorage.removeItem('wa_access_token');
    window.localStorage.removeItem('wa_refresh_token');
    window.localStorage.removeItem('wa_user');
    router.replace('/login');
  }

  if (!authChecked)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">
            Opening secure workspace...
          </span>
        </div>
      </div>
    );

  const sidebar = (
    <aside className="flex h-full w-72 flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Logo />
        <span className="ml-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {isAdmin ? 'Admin' : 'Workspace'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {groups.map((group, index) => (
          <div
            key={group.label || `main-${index}`}
            className={cn(index > 0 && 'mt-4')}
          >
            {group.label && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={
                    pathname === item.href ||
                    (item.href !== '/dashboard' &&
                      item.href !== '/admin/dashboard' &&
                      pathname.startsWith(`${item.href}/`))
                  }
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-2">
        <div className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-50">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => void signOut()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-shell flex h-svh min-h-0 overflow-hidden bg-slate-50">
      <div
        className={cn(
          'hidden shrink-0 p-2 pr-0 transition-[width,opacity] duration-200 lg:block',
          desktopOpen
            ? 'w-[296px] opacity-100'
            : 'w-0 overflow-hidden p-0 opacity-0',
        )}
      >
        {sidebar}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="relative h-full w-72 p-2">{sidebar}</div>
        </div>
      )}
      <section className="m-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-white lg:m-2 lg:ml-2 lg:rounded-xl lg:border lg:shadow-sm">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 hidden lg:inline-flex"
            onClick={() => setDesktopOpen((value) => !value)}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <h1 className="truncate text-sm font-medium">
            {currentItem?.label || (isAdmin ? 'Admin' : 'Workspace')}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/docs"
              className="hidden h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-slate-100 hover:text-foreground sm:flex"
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
            <Link
              href={isAdmin ? '/admin/health' : '/dashboard/connect'}
              className="hidden h-8 items-center rounded-md px-2 hover:bg-slate-100 md:flex"
            >
              <StatusDot status={status} label={statusLabel} />
            </Link>
            <Link
              href={isAdmin ? '/admin/settings' : '/dashboard/connect'}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-foreground"
              aria-label={
                isAdmin ? 'Open admin settings' : 'Open connection settings'
              }
            >
              {isAdmin ? initials : <Smartphone className="h-4 w-4" />}
            </Link>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] p-4 lg:p-6">
            {children}
          </div>
        </main>
      </section>
    </div>
  );
}
