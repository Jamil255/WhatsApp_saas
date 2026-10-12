"use client";

import { LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { DashboardError, DashboardLoading, DashboardPageHeader } from "@/components/dashboard-page";
import { ConnectionManagerCard } from "@/components/connection-manager-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStatus } from "@/lib/queries";

const notes = [
  { icon: ShieldCheck, color: "text-primary", title: "Workspace isolated", copy: "Session state belongs only to the current tenant workspace." },
  { icon: RefreshCw, color: "text-blue-600", title: "Live status", copy: "Connection state refreshes automatically through the session API." },
  { icon: LockKeyhole, color: "text-violet-600", title: "You stay in control", copy: "Disconnect the linked device from this screen whenever needed." },
];

export default function ConnectPage() {
  const session = useSessionStatus();
  if (session.isLoading) return <DashboardLoading rows={2} />;
  if (session.isError) return <DashboardError message={session.error instanceof Error ? session.error.message : "Session API is unavailable."} onRetry={() => session.refetch()} />;
  return <div><DashboardPageHeader eyebrow="Channel settings" title="Connect WhatsApp" description="Generate a secure QR code, scan it with Linked devices, and verify your workspace number." /><ConnectionManagerCard session={session.data} onChanged={() => { void session.refetch(); }} /><div className="mt-6 grid gap-4 md:grid-cols-3">{notes.map(({ icon: Icon, color, title, copy }) => <Card key={title} className="shadow-none"><CardHeader className="pb-3"><Icon className={`h-5 w-5 ${color}`} /><CardTitle className="mt-3">{title}</CardTitle></CardHeader><CardContent className="text-xs leading-5 text-muted-foreground">{copy}</CardContent></Card>)}</div></div>;
}
