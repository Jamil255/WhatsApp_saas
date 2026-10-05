"use client";

import { Bell, Building2, Check, CreditCard, Globe2, LockKeyhole, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const tabs = [{ label: "Workspace", icon: Building2 }, { label: "Profile", icon: UserRound }, { label: "Notifications", icon: Bell }, { label: "Security", icon: LockKeyhole }, { label: "Billing", icon: CreditCard }];

export default function SettingsPage() {
  const [active, setActive] = useState("Workspace");

  return (
    <>
      <PageHeader eyebrow="Workspace preferences" title="Settings" description="Keep your workspace, notifications, and security preferences up to date." />
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <nav className="space-y-1">{tabs.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActive(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${active === label ? "bg-primary text-white" : "text-muted-foreground hover:bg-white hover:text-ink"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>{active} settings</CardTitle><p className="mt-1 text-xs text-muted-foreground">{active === "Workspace" ? "How your Nexora workspace appears to your team." : "Manage your Nexora preferences."}</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold text-ink">Workspace name</label><Input defaultValue="Acme Inc." /></div><div><label className="mb-2 block text-xs font-bold text-ink">Workspace slug</label><Input defaultValue="acme-inc" /></div></div><div><label className="mb-2 block text-xs font-bold text-ink">Default timezone</label><button className="flex h-11 w-full max-w-sm items-center justify-between rounded-lg border border-input px-3.5 text-left text-sm text-ink"><span className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-slate-400" /> Asia/Karachi (UTC+05:00)</span><span className="text-slate-400">⌄</span></button></div><div><label className="mb-2 block text-xs font-bold text-ink">Workspace description</label><textarea defaultValue="Customer conversations for the Acme team." className="flex min-h-[100px] w-full max-w-xl resize-none rounded-lg border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></div></CardContent></Card>
          <div className="flex justify-end"><Button><Save className="mr-2 h-4 w-4" /> Save changes</Button></div>
          <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-primary"><Check className="h-5 w-5" /></span><div className="flex-1"><p className="text-sm font-bold text-ink">Your workspace is healthy</p><p className="mt-1 text-xs text-muted-foreground">Last saved just now. Your preferences are synced across the team.</p></div></CardContent></Card>
        </div>
      </div>
    </>
  );
}
