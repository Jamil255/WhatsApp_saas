import type { LucideIcon } from "lucide-react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardPageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</header>;
}

export function DashboardStat({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: "green" | "blue" | "violet" | "amber" | "red" }) {
  const tones = { green: "text-emerald-600", blue: "text-blue-600", violet: "text-violet-600", amber: "text-amber-600", red: "text-red-600" };
  return <Card className="rounded-xl bg-gradient-to-t from-primary/[.035] to-white shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className={cn("h-4 w-4", tones[tone])} /></div><p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>{detail && <p className="mt-3 text-xs text-muted-foreground">{detail}</p>}</CardContent></Card>;
}

export function DashboardLoading({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-6"><Skeleton className="h-12 w-72" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-20 rounded-2xl" />{Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>;
}

export function DashboardError({ title = "Unable to load this page", message, onRetry }: { title?: string; message: string; onRetry: () => void }) {
  return <Card className="flex min-h-[380px] items-center justify-center border-red-100 bg-red-50/40"><CardContent className="max-w-md p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600"><CircleAlert className="h-5 w-5" /></span><h2 className="mt-5 font-display text-xl font-bold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p><Button className="mt-6" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50/60 p-8 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Icon className="h-5 w-5" /></span><p className="mt-4 text-sm font-bold text-ink">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
