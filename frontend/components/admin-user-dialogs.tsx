"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, EyeOff, KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { type AdminTenant, type AdminUser } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type AdminUserFormValues = {
  name: string;
  email: string;
  phoneNumber: string;
  tenantId: string;
  role: AdminUser["role"];
  password?: string;
  isActive: boolean;
};

const passwordIsStrong = (value: string) => value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{children}{hint && <span className="text-xs font-normal leading-5 text-muted-foreground">{hint}</span>}</label>;
}

export function AdminUserEditorDialog({ open, onOpenChange, user, currentUserId, tenants, pending, error, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; user: AdminUser | null; currentUserId?: string; tenants: AdminTenant[]; pending: boolean; error?: string; onSubmit: (values: AdminUserFormValues) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState<AdminUserFormValues>({ name: "", email: "", phoneNumber: "", tenantId: "", role: "tenant_agent", password: "", isActive: true });
  const editing = Boolean(user);
  const editingSelf = user?.id === currentUserId;

  useEffect(() => {
    if (!open) return;
    setShowPassword(false);
    setValues(user ? { name: user.name, email: user.email, phoneNumber: user.phoneNumber || "", tenantId: user.tenantId, role: user.role, isActive: user.isActive } : { name: "", email: "", phoneNumber: "", tenantId: tenants[0]?.id || "", role: "tenant_agent", password: "", isActive: true });
  }, [open, user, tenants]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
  const phoneValid = !values.phoneNumber || /^\+[1-9]\d{6,14}$/.test(values.phoneNumber);
  const canSubmit = values.name.trim().length >= 2 && emailValid && phoneValid && Boolean(values.tenantId) && (editing || passwordIsStrong(values.password || ""));

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl gap-0 p-0"><DialogHeader className="border-b px-6 py-5 pr-14"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary">{editing ? <ShieldCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}</span><div><DialogTitle>{editing ? "Edit user access" : "Add a new user"}</DialogTitle><DialogDescription className="mt-1">{editing ? "Update profile, organization, role, and account status." : "Create credentials and assign the correct organization access."}</DialogDescription></div></div></DialogHeader><form onSubmit={(event) => { event.preventDefault(); if (canSubmit) onSubmit(values); }}><div className="grid max-h-[65vh] gap-5 overflow-y-auto px-6 py-5 sm:grid-cols-2"><Field label="Full name"><Input autoFocus value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Ayesha Khan" /></Field><Field label="Email address"><Input type="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} placeholder="ayesha@company.com" /></Field><Field label="Phone number" hint="Optional. Use international E.164 format."><Input value={values.phoneNumber} onChange={(event) => setValues((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="+923001234567" /></Field><Field label="Organization"><select disabled={editingSelf} className="h-10 rounded-md border bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-muted-foreground" value={values.tenantId} onChange={(event) => setValues((current) => ({ ...current, tenantId: event.target.value }))}>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.companyName}</option>)}</select></Field><Field label="Access role" hint={editingSelf ? "Your own access scope is protected from accidental lockout." : values.role === "super_admin" ? "Full access to every organization and platform setting." : values.role === "tenant_admin" ? "Manages the selected organization and its team." : "Uses messaging and workspace tools in the selected organization."}><select disabled={editingSelf} className="h-10 rounded-md border bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-muted-foreground" value={values.role} onChange={(event) => setValues((current) => ({ ...current, role: event.target.value as AdminUser["role"] }))}><option value="tenant_agent">Tenant user</option><option value="tenant_admin">Tenant admin</option><option value="super_admin">Platform admin</option></select></Field>{!editing && <Field label="Temporary password" hint="At least 8 characters with uppercase, lowercase, and a number."><div className="relative"><Input type={showPassword ? "text" : "password"} value={values.password || ""} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} className="pr-10" autoComplete="new-password" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}<span className="sr-only">Toggle password visibility</span></Button></div></Field>}<label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3 sm:col-span-2"><input type="checkbox" checked={values.isActive} disabled={editingSelf} onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-emerald-700 disabled:opacity-50" /><span><span className="block text-sm font-medium">Active account</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{editingSelf ? "The signed-in account cannot deactivate itself." : "Inactive users cannot sign in. Access changes revoke their existing refresh sessions."}</span></span></label>{error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</div>}</div><DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!canSubmit || pending}>{pending ? "Saving…" : editing ? "Save changes" : "Create user"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function AdminPasswordDialog({ user, open, onOpenChange, pending, error, onSubmit }: { user: AdminUser | null; open: boolean; onOpenChange: (open: boolean) => void; pending: boolean; error?: string; onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => { if (open) { setPassword(""); setConfirmation(""); setShow(false); } }, [open]);
  const strong = passwordIsStrong(password);
  const matches = password === confirmation;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="gap-0 p-0"><DialogHeader className="border-b px-6 py-5 pr-14"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><KeyRound className="h-5 w-5" /></span><div><DialogTitle>Change password</DialogTitle><DialogDescription className="mt-1">Set a new password for {user?.name}.</DialogDescription></div></div></DialogHeader><form onSubmit={(event) => { event.preventDefault(); if (strong && matches) onSubmit(password); }}><div className="space-y-4 px-6 py-5"><div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Changing the password immediately revokes this user&apos;s active refresh sessions.</div><Field label="New password" hint="Minimum 8 characters with uppercase, lowercase, and a number."><div className="relative"><Input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="pr-10" autoComplete="new-password" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShow((value) => !value)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></Field><Field label="Confirm new password"><Input type={show ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></Field>{confirmation && !matches && <p className="text-xs text-red-600">Passwords do not match.</p>}{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}</div><DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!strong || !matches || pending}>{pending ? "Changing…" : "Change password"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function AdminDeleteUserDialog({ user, currentUserId, open, onOpenChange, pending, error, onConfirm }: { user: AdminUser | null; currentUserId?: string; open: boolean; onOpenChange: (open: boolean) => void; pending: boolean; error?: string; onConfirm: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => { if (open) setConfirmation(""); }, [open]);
  const isSelf = user?.id === currentUserId;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="gap-0 p-0"><DialogHeader className="border-b px-6 py-5 pr-14"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700"><Trash2 className="h-5 w-5" /></span><div><DialogTitle>Delete user permanently</DialogTitle><DialogDescription className="mt-1">This action cannot be undone.</DialogDescription></div></div></DialogHeader><div className="space-y-4 px-6 py-5"><div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">{user?.name}</p><p className="mt-1 text-xs leading-5">{isSelf ? "You cannot delete the account currently signed in." : "The account and its active sessions will be permanently removed."}</p></div></div>{!isSelf && <Field label={<>Type <strong>DELETE</strong> to confirm</>}><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" /></Field>}{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}</div><DialogFooter className="border-t px-6 py-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="danger" disabled={isSelf || confirmation !== "DELETE" || pending} onClick={onConfirm}>{pending ? "Deleting…" : "Delete user"}</Button></DialogFooter></DialogContent></Dialog>;
}
