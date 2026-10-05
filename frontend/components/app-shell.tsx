"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { StatusDot } from "@/components/status-dot";
import { cn } from "@/lib/utils";

type ShellMode = "workspace" | "admin";
type NavItem = { label: string; href: string; icon: LucideIcon; badge?: string };

const workspaceNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: "12" },
  { label: "Broadcasts", href: "/dashboard/broadcasts", icon: MessageSquare },
  { label: "Templates", href: "/dashboard/templates", icon: FileText },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { label: "Platform overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Organizations", href: "/admin/organizations", icon: Users, badge: "48" },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "System health", href: "/admin/health", icon: Activity },
  { label: "Audit logs", href: "/admin/audit-logs", icon: ShieldCheck },
];

const workspaceSecondary: NavItem[] = [
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "API & webhooks", href: "/dashboard/developer", icon: Code2 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavigationLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
        active
          ? "bg-primary text-white shadow-sm shadow-primary/20"
          : "text-muted-foreground hover:bg-emerald-50/70 hover:text-ink",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-primary")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && <span className={cn("rounded-md px-1.5 py-0.5 text-[10px]", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{item.badge}</span>}
        </>
      )}
    </Link>
  );
}

export function AppShell({ children, mode = "workspace" }: { children: React.ReactNode; mode?: ShellMode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = mode === "admin";
  const primaryNav = isAdmin ? adminNav : workspaceNav;
  const secondaryNav = isAdmin ? [{ label: "Admin settings", href: "/admin/settings", icon: Settings }] : workspaceSecondary;
  const ConnectionIcon = isAdmin ? Activity : Smartphone;
  const currentPage = pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") || "overview";
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-[#f5f8f6]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-border bg-white transition-all duration-300 lg:sticky lg:top-0 lg:translate-x-0",
          collapsed ? "w-[76px]" : "w-[254px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={cn("flex h-[76px] items-center border-b border-border px-5", collapsed && "justify-center px-0")}>
          <Logo compact={collapsed} />
          {!collapsed && <span className="ml-auto rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-primary">{isAdmin ? "Admin" : "Pro"}</span>}
          <button onClick={closeMobile} className="ml-auto rounded-lg p-1.5 text-slate-400 lg:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <div className={cn("mb-5 flex items-center gap-3 rounded-xl border p-3", isAdmin ? "border-violet-100 bg-violet-50/50" : "border-emerald-100 bg-emerald-50/60")}>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold", isAdmin ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-primary")}>{isAdmin ? "OW" : "AI"}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-ink">{isAdmin ? "Nexora Control" : "Acme Inc."}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{isAdmin ? "Platform workspace" : "Growth workspace"}</p></div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{isAdmin ? "Control center" : "Workspace"}</div>
          <div className="space-y-1">{primaryNav.map((item) => <NavigationLink key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} onNavigate={closeMobile} />)}</div>
          <div className="my-6 h-px bg-slate-100" />
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Manage</div>
          <div className="space-y-1">{secondaryNav.map((item) => <NavigationLink key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} onNavigate={closeMobile} />)}</div>
        </div>

        <div className="space-y-3 p-3">
          <Link href={isAdmin ? "/admin/health" : "/dashboard/connect"} onClick={closeMobile} className={cn("flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/30", collapsed ? "justify-center p-2" : "", isAdmin ? "border-violet-100 bg-violet-50/50 hover:bg-violet-50" : "border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50")}>
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", isAdmin ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-primary")}><ConnectionIcon className="h-4 w-4" /></span>
            {!collapsed && <span className="min-w-0"><span className="block truncate text-xs font-bold text-ink">{isAdmin ? "All systems nominal" : "WhatsApp connected"}</span><span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{isAdmin ? "Live monitoring" : "+92 300 123 4567"}</span></span>}
          </Link>
          <div className={cn("flex items-center rounded-xl bg-slate-50 p-2.5", collapsed ? "justify-center" : "gap-2.5")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">OS</div>
            {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-bold text-ink">Olivia Smith</p><p className="truncate text-[10px] text-muted-foreground">{isAdmin ? "Super admin" : "Acme Inc."}</p></div>}
            {!collapsed && <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-400" />}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink lg:block" title="Toggle sidebar" aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
            <div className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex"><span>{isAdmin ? "Admin" : "Workspace"}</span><ChevronRight className="h-3 w-3" /><span className="truncate font-semibold capitalize text-ink">{currentPage}</span></div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="hidden h-9 w-48 items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 text-left text-xs text-slate-400 transition hover:border-primary/30 hover:bg-white md:flex"><Search className="h-3.5 w-3.5" /><span className="flex-1">Search workspace</span><span className="rounded border border-border bg-white px-1.5 py-0.5 text-[9px] text-slate-400">⌘ K</span></button>
            <Link href={isAdmin ? "/admin/health" : "/dashboard/connect"} className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary xl:flex"><StatusDot status="online" label={isAdmin ? "All systems operational" : "WhatsApp online"} /></Link>
            <button className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink" aria-label="Notifications"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-white" /></button>
            <button className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50" aria-label="Open profile menu"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">OS</span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-5 sm:p-8">{children}</main>
        <footer className="hidden items-center justify-between border-t border-border bg-white/60 px-8 py-3 text-[10px] text-slate-400 lg:flex"><span>Nexora workspace · {isAdmin ? "Platform control center" : "Private workspace"}</span><span className="flex items-center gap-3"><span className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Help center</span><span>v1.0.0</span></span></footer>
      </div>
      {mobileOpen && <div onClick={closeMobile} className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden" />}
    </div>
  );
}
