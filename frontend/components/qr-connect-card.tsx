"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, RefreshCw, Smartphone, Wifi, XCircle } from "lucide-react";
import { apiBaseUrl, apiFetch, type SessionStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/status-dot";

type ConnectionState = "idle" | "connecting" | "qr" | "otp" | "connected" | "error";

export function QrConnectCard({ session, onChanged }: { session?: SessionStatus | null; onChanged?: () => void }) {
  const [state, setState] = useState<ConnectionState>(session?.status === "connected" ? "connected" : "idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState(session?.phoneNumber || "");
  const [error, setError] = useState("");
  const eventSource = useRef<EventSource | null>(null);

  useEffect(() => () => eventSource.current?.close(), []);
  useEffect(() => {
    if (session?.status === "connected") setState("connected");
    else if (session?.status === "connecting") setState("connecting");
    else if (["disconnected", "destroyed", "no_session", "error"].includes(session?.status || "") && state === "connected") setState("idle");
    if (session?.phoneNumber) setPhone(session.phoneNumber);
  }, [session?.phoneNumber, session?.status, state]);

  function listenForQr() {
    const user = JSON.parse(window.localStorage.getItem("wa_user") || "{}") as { tenantId?: string };
    if (!user.tenantId) { setError("Your account is not attached to a workspace."); setState("error"); return; }
    eventSource.current?.close();
    const stream = new EventSource(`${apiBaseUrl}/qr/stream?tenantId=${encodeURIComponent(user.tenantId)}`);
    eventSource.current = stream;
    stream.addEventListener("qr_update", (event) => { const data = JSON.parse((event as MessageEvent).data); setQrCode(data.qrCode); setState("qr"); });
    stream.addEventListener("otp_required", (event) => { const data = JSON.parse((event as MessageEvent).data); setPhone(data.phoneNumber || ""); setState("otp"); });
    stream.addEventListener("qr_expired", () => setState("idle"));
    stream.onerror = () => setError("The QR stream disconnected. Retry to generate a fresh code.");
  }

  async function startConnection() {
    setError(""); setState("connecting"); listenForQr();
    try { await apiFetch("/sessions/connect", { method: "POST" }); } catch (err) { eventSource.current?.close(); setError(err instanceof Error ? err.message : "Unable to start connection."); setState("error"); }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try { await apiFetch("/sessions/verify-otp", { method: "POST", body: JSON.stringify({ otp }) }); setState("connected"); eventSource.current?.close(); onChanged?.(); } catch (err) { setError(err instanceof Error ? err.message : "Invalid OTP."); }
  }

  async function disconnect() {
    setError("");
    try { await apiFetch("/sessions/disconnect", { method: "POST" }); setState("idle"); setQrCode(null); setPhone(""); onChanged?.(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to disconnect."); }
  }

  if (state === "connected") return <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-soft"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-primary"><Wifi className="h-6 w-6" /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold tracking-[-.03em] text-ink">WhatsApp is connected</h2><StatusDot status="online" label="Live" /></div><p className="mt-1 text-sm text-muted-foreground">Messages, broadcasts, and inbox replies are enabled.</p><p className="mt-3 text-sm font-semibold text-ink">{phone || "Connected number"}<span className="ml-2 text-xs font-normal text-muted-foreground">· {session?.connectedAt ? `Connected ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(session.connectedAt))}` : "Active session"}</span></p></div><Button variant="outline" onClick={disconnect}>Disconnect</Button></div><div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-3"><div className="flex items-center gap-2.5 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Messaging ready</div><div className="flex items-center gap-2.5 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 text-primary" />Credentials encrypted</div><div className="flex items-center gap-2.5 text-xs text-muted-foreground"><Smartphone className="h-4 w-4 text-blue-500" />Linked device active</div></div>{error && <p className="mt-4 text-xs text-red-600">{error}</p>}</div>;

  return <div className="grid gap-8 rounded-2xl border bg-white p-6 shadow-soft lg:grid-cols-[.85fr_1.15fr] lg:p-8"><div className="flex flex-col justify-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-primary"><Smartphone className="h-5 w-5" /></div><h2 className="font-display text-xl font-bold tracking-[-.04em] text-ink">Connect your WhatsApp</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Link a number once to enable live messaging, broadcasts, and inbox replies.</p><div className="mt-6 space-y-4">{["Open WhatsApp and go to Linked devices", "Scan the secure QR code", "Confirm the OTP sent to WhatsApp"].map((step, index) => <div key={step} className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</span><p className="text-sm font-semibold text-ink">{step}</p></div>)}</div>{error && <div className="mt-5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}</div><div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl bg-[#f4faf5] p-6 text-center">{state === "idle" || state === "error" ? <><div className="mb-5 flex h-44 w-44 items-center justify-center rounded-2xl border-8 border-white bg-white shadow-soft"><div className="qr-placeholder h-32 w-32 rounded-md opacity-80" /></div><p className="text-sm font-bold text-ink">Ready to connect</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">A new QR code will appear after the connection starts.</p><Button onClick={startConnection} className="mt-5"><Wifi className="mr-2 h-4 w-4" />Start connection</Button></> : state === "connecting" ? <><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="mt-5 text-sm font-bold text-ink">Preparing secure session…</p><p className="mt-1 text-xs text-muted-foreground">This usually takes a few seconds.</p></> : state === "qr" ? <><div className="mb-4 flex h-44 w-44 items-center justify-center rounded-2xl border-8 border-white bg-white shadow-soft">{qrCode ? <img src={qrCode} alt="Scan to connect WhatsApp" className="h-32 w-32" /> : <div className="qr-placeholder h-32 w-32 rounded-md" />}</div><p className="text-sm font-bold text-ink">Scan with WhatsApp</p><p className="mt-1 text-xs text-muted-foreground">The code refreshes when you retry.</p><Button variant="ghost" size="sm" className="mt-3" onClick={startConnection}><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh code</Button></> : <form onSubmit={verifyOtp} className="w-full max-w-xs"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm"><LockKeyhole className="h-6 w-6" /></div><p className="mt-4 text-sm font-bold text-ink">Enter verification code</p><p className="mt-1 text-xs leading-5 text-muted-foreground">We sent a 6-digit code to {phone || "your number"}.</p><Input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" placeholder="000000" className="mt-5 text-center text-lg font-bold tracking-[.45em]" /><Button type="submit" disabled={otp.length !== 6} className="mt-3 w-full">Verify and finish</Button></form>}</div></div>;
}
