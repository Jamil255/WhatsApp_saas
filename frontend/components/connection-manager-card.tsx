"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, LockKeyhole, QrCode, RefreshCw, Send, Smartphone, Wifi, XCircle } from "lucide-react";
import { apiFetch, type SessionStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/status-dot";

type ConnectionState = "idle" | "connecting" | "qr" | "otp" | "connected" | "error";
type QrState = SessionStatus & { qrStatus?: string; qrCode?: string | null; attempt?: number; maxAttempts?: number; expiresAt?: string | null };

function stateFromSession(session?: SessionStatus | null): ConnectionState {
  if (session?.status === "connected") return "connected";
  if (session?.status === "pending_verification") return "otp";
  if (session?.status === "connecting") return "connecting";
  return "idle";
}

export function ConnectionManagerCard({ session, adminTenantId, workspaceName, onChanged }: { session?: SessionStatus | null; adminTenantId?: string; workspaceName?: string; onChanged?: () => void }) {
  const [state, setState] = useState<ConnectionState>(() => stateFromSession(session));
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState(session?.phoneNumber || "");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const base = adminTenantId ? `/admin/tenants/${adminTenantId}/connection` : "/sessions";
  const paths = { connect: `${base}/connect`, qr: `${base}/qr`, verify: `${base}/verify-otp`, resend: `${base}/resend-otp`, disconnect: `${base}/disconnect`, restart: `${base}/restart` };

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const pollConnection = useCallback(async () => {
    try {
      const data = await apiFetch<QrState>(paths.qr);
      if (data.phoneNumber) setPhone(data.phoneNumber);
      if (data.status === "connected") { setState("connected"); setQrCode(null); stopPolling(); onChanged?.(); return; }
      if (data.status === "pending_verification") { setState("otp"); setQrCode(null); stopPolling(); return; }
      if (data.qrCode) { setQrCode(data.qrCode); setAttempt(data.attempt || 0); setMaxAttempts(data.maxAttempts || 0); setState("qr"); return; }
      if (data.status === "connecting") setState("connecting");
      if (["disconnected", "destroyed", "error"].includes(data.status) && data.qrStatus === "expired") { setError("The QR code expired. Generate a fresh code to continue."); setState("error"); stopPolling(); }
    } catch (pollError) {
      setError(pollError instanceof Error ? pollError.message : "Unable to read the QR connection state.");
      setState("error");
      stopPolling();
    }
  }, [onChanged, paths.qr, stopPolling]);

  const beginPolling = useCallback(() => {
    stopPolling();
    void pollConnection();
    pollRef.current = setInterval(() => void pollConnection(), 1400);
  }, [pollConnection, stopPolling]);

  useEffect(() => {
    setState(stateFromSession(session));
    if (session?.phoneNumber) setPhone(session.phoneNumber);
    if (["connecting", "pending_verification"].includes(session?.status || "")) beginPolling();
    return stopPolling;
  }, [beginPolling, session?.phoneNumber, session?.status, stopPolling]);

  async function startConnection(restart = false) {
    setError(""); setQrCode(null); setOtp(""); setState("connecting");
    try { await apiFetch(restart ? paths.restart : paths.connect, { method: "POST" }); beginPolling(); }
    catch (connectionError) { setError(connectionError instanceof Error ? connectionError.message : "Unable to start the connection."); setState("error"); }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try { const result = await apiFetch<SessionStatus>(paths.verify, { method: "POST", body: JSON.stringify({ otp }) }); setPhone(result.phoneNumber || phone); setState("connected"); stopPolling(); onChanged?.(); }
    catch (verificationError) { setError(verificationError instanceof Error ? verificationError.message : "The verification code is invalid."); }
  }

  async function resendOtp() {
    setResending(true); setError("");
    try { await apiFetch(paths.resend, { method: "POST" }); }
    catch (resendError) { setError(resendError instanceof Error ? resendError.message : "Unable to resend the verification code."); }
    finally { setResending(false); }
  }

  async function disconnect() {
    setError("");
    try { await apiFetch(paths.disconnect, { method: "POST" }); stopPolling(); setState("idle"); setQrCode(null); setPhone(""); onChanged?.(); }
    catch (disconnectError) { setError(disconnectError instanceof Error ? disconnectError.message : "Unable to disconnect WhatsApp."); }
  }

  if (state === "connected") return <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white"><div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Wifi className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold">WhatsApp connected</h2><StatusDot status="online" label="Live" /></div><p className="mt-1 text-sm text-muted-foreground">{workspaceName ? `${workspaceName} can now send and receive messages.` : "Messaging, broadcasts, and inbox replies are ready."}</p><p className="mt-3 text-sm font-medium">{phone || "Connected number"}</p></div><Button variant="outline" onClick={disconnect}>Disconnect</Button></div><div className="grid gap-3 border-t bg-emerald-50/40 px-6 py-4 text-xs text-muted-foreground sm:grid-cols-3"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Messaging ready</span><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-emerald-600" />Credentials encrypted</span><span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" />Linked device active</span></div>{error && <p className="border-t px-6 py-3 text-sm text-red-600">{error}</p>}</div>;

  return <div className="grid overflow-hidden rounded-xl border bg-white lg:grid-cols-[.85fr_1.15fr]"><div className="border-b p-6 lg:border-b-0 lg:border-r lg:p-8"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-primary"><QrCode className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-semibold">Connect WhatsApp</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{workspaceName ? `Link a WhatsApp number to ${workspaceName}.` : "Link your workspace number using WhatsApp's secure linked-device flow."}</p><div className="mt-7 space-y-5">{[{ title: "Open Linked devices", copy: "WhatsApp → Settings → Linked devices" }, { title: "Scan the QR code", copy: "Point your phone at the code shown here" }, { title: "Verify the connection", copy: "Enter the 6-digit code sent to WhatsApp" }].map((step, index) => <div key={step.title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">{index + 1}</span><div><p className="text-sm font-medium">{step.title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.copy}</p></div></div>)}</div>{error && <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}</div><div className="flex min-h-[390px] flex-col items-center justify-center bg-slate-50/70 p-6 text-center sm:p-8">{state === "idle" || state === "error" ? <><div className="flex h-44 w-44 items-center justify-center rounded-2xl border bg-white shadow-sm"><QrCode className="h-16 w-16 text-slate-200" /></div><p className="mt-5 text-sm font-semibold">Ready to generate a secure QR</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">The QR is short-lived and only links the selected workspace.</p><Button onClick={() => void startConnection(state === "error")} className="mt-5"><QrCode className="mr-2 h-4 w-4" />Generate QR code</Button></> : state === "connecting" ? <><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm"><Loader2 className="h-7 w-7 animate-spin text-primary" /></span><p className="mt-5 text-sm font-semibold">Preparing encrypted session…</p><p className="mt-1 text-xs text-muted-foreground">Waiting for WhatsApp to issue the QR code.</p></> : state === "qr" ? <><div className="rounded-2xl border bg-white p-4 shadow-sm">{qrCode ? <img src={qrCode} alt={`Scan to connect ${workspaceName || "WhatsApp"}`} className="h-56 w-56" /> : <Loader2 className="m-20 h-7 w-7 animate-spin text-primary" />}</div><div className="mt-4 flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /><p className="text-sm font-semibold">Scan this code with WhatsApp</p></div><p className="mt-1 text-xs text-muted-foreground">QR attempt {attempt || 1}{maxAttempts ? ` of ${maxAttempts}` : ""} · refreshes automatically</p><Button variant="outline" size="sm" className="mt-4" onClick={() => void startConnection(true)}><RefreshCw className="mr-2 h-3.5 w-3.5" />Generate a new code</Button></> : <form onSubmit={verifyOtp} className="w-full max-w-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><KeyRound className="h-6 w-6" /></span><p className="mt-5 text-base font-semibold">Verify linked number</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the 6-digit code sent to {phone || "the connected WhatsApp number"}.</p><Input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-6 h-12 text-center text-lg font-semibold tracking-[.4em]" /><Button type="submit" disabled={otp.length !== 6} className="mt-3 w-full">Verify connection</Button><Button type="button" variant="ghost" size="sm" disabled={resending} className="mt-2" onClick={() => void resendOtp()}><Send className="mr-2 h-3.5 w-3.5" />{resending ? "Sending…" : "Resend code"}</Button></form>}</div></div>;
}
