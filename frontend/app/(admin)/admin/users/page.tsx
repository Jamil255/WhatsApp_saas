"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, ShieldCheck, UserCheck, UserRoundCog, Users, X } from "lucide-react";
import { AdminDeleteUserDialog, AdminPasswordDialog, AdminUserEditorDialog, type AdminUserFormValues } from "@/components/admin-user-dialogs";
import { DashboardError, DashboardLoading, DashboardPageHeader, DashboardStat, EmptyState } from "@/components/dashboard-page";
import { DataTablePagination, DataTableToolbar, pageSlice, RecordDetailsDialog, RowActionsMenu } from "@/components/dashboard-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { getStoredUser, queryKeys, type AdminUser, useAdminTenants, useAdminUsers } from "@/lib/queries";

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
const roleLabel = (role: AdminUser["role"]) => role === "super_admin" ? "Platform admin" : role === "tenant_admin" ? "Tenant admin" : "Tenant user";
const roleVariant = (role: AdminUser["role"]): "danger" | "blue" | "secondary" => role === "super_admin" ? "danger" : role === "tenant_admin" ? "blue" : "secondary";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const query = useAdminUsers();
  const tenants = useAdminTenants();
  const currentUser = getStoredUser();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [editorUser, setEditorUser] = useState<AdminUser | "new" | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState("");

  async function refreshUserData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTenants }),
    ]);
  }

  const createUser = useMutation({
    mutationFn: (values: AdminUserFormValues) => apiFetch<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async (user) => { setEditorUser(null); setNotice(`${user.name} was added successfully.`); await refreshUserData(); },
  });
  const updateUser = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AdminUserFormValues }) => apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ name: values.name, email: values.email, phoneNumber: values.phoneNumber, tenantId: values.tenantId, role: values.role, isActive: values.isActive }) }),
    onSuccess: async (user) => { setEditorUser(null); setSelected((current) => current?.id === user.id ? user : current); setNotice(`${user.name}'s access was updated.`); await refreshUserData(); },
  });
  const changePassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => apiFetch<{ message: string }>(`/admin/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),
    onSuccess: async (result) => { setPasswordUser(null); setNotice(result.message); await refreshUserData(); },
  });
  const removeUser = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: async () => { const name = deleteUser?.name || "User"; setDeleteUser(null); setSelected(null); setNotice(`${name} was permanently deleted.`); await refreshUserData(); },
  });
  const users = query.data?.users || [];
  const filtered = useMemo(() => users.filter((user) => (role === "all" || user.role === role) && (status === "all" || (status === "active") === user.isActive) && `${user.name} ${user.email} ${user.organization} ${user.phoneNumber || ""}`.toLowerCase().includes(search.toLowerCase())), [users, role, status, search]);
  const rows = pageSlice(filtered, page, pageSize);

  if (query.isLoading || tenants.isLoading) return <DashboardLoading />;
  if (query.isError || tenants.isError || !query.data || !tenants.data) return <DashboardError title="User directory is unavailable" message={(query.error || tenants.error) instanceof Error ? (query.error || tenants.error as Error).message : "The admin users API did not respond."} onRetry={() => { void query.refetch(); void tenants.refetch(); }} />;

  const platformAdmins = users.filter((user) => user.role === "super_admin").length;
  const tenantAdmins = users.filter((user) => user.role === "tenant_admin").length;
  const tenantUsers = users.filter((user) => user.role === "tenant_agent").length;
  const activeUsers = users.filter((user) => user.isActive).length;

  return <div>
    <DashboardPageHeader eyebrow="Identity & access" title="Users & administrators" description="Create accounts, control organization access, reset passwords, and manage the full user lifecycle." actions={<Button onClick={() => { createUser.reset(); setEditorUser("new"); }}><Plus className="mr-2 h-4 w-4" />Add user</Button>} />
    {notice && <div className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="flex-1">{notice}</span><Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-800" onClick={() => setNotice("")}><X className="h-3.5 w-3.5" /><span className="sr-only">Dismiss</span></Button></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DashboardStat label="All users" value={users.length.toLocaleString()} detail="Across the Nexora platform" icon={Users} tone="violet" /><DashboardStat label="Platform admins" value={platformAdmins.toLocaleString()} detail="Global control-plane access" icon={ShieldCheck} tone="amber" /><DashboardStat label="Tenant admins" value={tenantAdmins.toLocaleString()} detail="Organization owners" icon={UserRoundCog} tone="blue" /><DashboardStat label="Active users" value={activeUsers.toLocaleString()} detail={`${tenantUsers} tenant team members`} icon={UserCheck} /></div>
    <section className="mt-6"><div className="mb-3"><h2 className="text-base font-semibold">User directory</h2><p className="mt-1 text-sm text-muted-foreground">Review access level, organization, account state, and recent sign-in activity.</p></div><DataTableToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(0); }} placeholder="Search name, email or organization..."><select className="h-9 rounded-md border bg-white px-3 text-sm" value={role} onChange={(event) => { setRole(event.target.value); setPage(0); }}><option value="all">All roles</option><option value="super_admin">Platform admins</option><option value="tenant_admin">Tenant admins</option><option value="tenant_agent">Tenant users</option></select><select className="h-9 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></DataTableToolbar>
      <div className="overflow-hidden rounded-lg border bg-white">{rows.length ? <Table className="min-w-[900px]"><TableHeader className="sticky top-0 z-10 bg-muted"><TableRow className="hover:bg-transparent"><TableHead className="pl-4">User</TableHead><TableHead>Role</TableHead><TableHead>Organization</TableHead><TableHead>Last sign in</TableHead><TableHead>Status</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{rows.map((user) => <TableRow key={user.id} className="cursor-pointer" onClick={() => setSelected(user)}><TableCell className="pl-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div></div></TableCell><TableCell><Badge variant={roleVariant(user.role)}>{roleLabel(user.role)}</Badge></TableCell><TableCell className="text-sm">{user.organization}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</TableCell><TableCell><Badge variant={user.isActive ? "success" : "outline"}>{user.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell onClick={(event) => event.stopPropagation()}><RowActionsMenu label={user.name} actions={[{ label: "View profile", onSelect: () => setSelected(user) }, { label: "Edit user", onSelect: () => { updateUser.reset(); setEditorUser(user); } }, { label: "Change password", onSelect: () => { changePassword.reset(); setPasswordUser(user); } }, { label: "Copy email", onSelect: () => void navigator.clipboard.writeText(user.email), separatorBefore: true }, { label: currentUser?.id === user.id ? "Cannot delete signed-in user" : "Delete user", onSelect: () => { removeUser.reset(); setDeleteUser(user); }, destructive: currentUser?.id !== user.id, disabled: currentUser?.id === user.id, separatorBefore: true }]} /></TableCell></TableRow>)}</TableBody></Table> : <div className="p-8"><EmptyState icon={Users} title="No users found" description="Try a different role, status, or search term." /></div>}<DataTablePagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} /></div>
    </section>
    {selected && <RecordDetailsDialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} icon={UserRoundCog} title={selected.name} description={selected.email} badge={<Badge variant={selected.isActive ? "success" : "outline"}>{selected.isActive ? "Active" : "Inactive"}</Badge>} sections={[{ title: "Account", fields: [{ label: "User ID", value: selected.id }, { label: "Role", value: roleLabel(selected.role) }, { label: "Email", value: selected.email }, { label: "Phone", value: selected.phoneNumber || "Not provided" }] }, { title: "Organization access", fields: [{ label: "Organization", value: selected.organization }, { label: "Tenant ID", value: selected.tenantId }, { label: "Created", value: formatDate(selected.createdAt) }, { label: "Last sign in", value: formatDate(selected.lastLoginAt) }] }]} />}
    <AdminUserEditorDialog open={editorUser !== null} onOpenChange={(open) => { if (!open) setEditorUser(null); }} user={editorUser === "new" ? null : editorUser} currentUserId={currentUser?.id} tenants={tenants.data} pending={createUser.isPending || updateUser.isPending} error={(createUser.error || updateUser.error) instanceof Error ? (createUser.error || updateUser.error as Error).message : undefined} onSubmit={(values) => { setNotice(""); if (editorUser === "new") createUser.mutate(values); else if (editorUser) updateUser.mutate({ id: editorUser.id, values }); }} />
    <AdminPasswordDialog open={Boolean(passwordUser)} onOpenChange={(open) => { if (!open) setPasswordUser(null); }} user={passwordUser} pending={changePassword.isPending} error={changePassword.error instanceof Error ? changePassword.error.message : undefined} onSubmit={(password) => { if (passwordUser) { setNotice(""); changePassword.mutate({ id: passwordUser.id, password }); } }} />
    <AdminDeleteUserDialog open={Boolean(deleteUser)} onOpenChange={(open) => { if (!open) setDeleteUser(null); }} user={deleteUser} currentUserId={currentUser?.id} pending={removeUser.isPending} error={removeUser.error instanceof Error ? removeUser.error.message : undefined} onConfirm={() => { if (deleteUser) { setNotice(""); removeUser.mutate(deleteUser.id); } }} />
  </div>;
}
