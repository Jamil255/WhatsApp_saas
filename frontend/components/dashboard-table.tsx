"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, EllipsisVertical, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type RowAction = { label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean; separatorBefore?: boolean };

export function RowActionsMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" />}><EllipsisVertical className="h-4 w-4" /><span className="sr-only">Open actions for {label}</span></DropdownMenuTrigger><DropdownMenuContent>{actions.map((action) => <div key={action.label}>{action.separatorBefore && <DropdownMenuSeparator />}<DropdownMenuItem destructive={action.destructive} disabled={action.disabled} onClick={action.onSelect}>{action.label}</DropdownMenuItem></div>)}</DropdownMenuContent></DropdownMenu>;
}

export function DataTableToolbar({ search, onSearchChange, placeholder, children }: { search: string; onSearchChange: (value: string) => void; placeholder: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full lg:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} className="h-9 pl-9 pr-9" />{search && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => onSearchChange("")}><X className="h-3.5 w-3.5" /><span className="sr-only">Clear search</span></Button>}</div>{children && <div className="flex flex-wrap items-center gap-2">{children}</div>}</div>;
}

export function DataTablePagination({ total, page, pageSize, onPageChange, onPageSizeChange }: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground">{total.toLocaleString()} row{total === 1 ? "" : "s"}</p><div className="flex items-center gap-2 sm:ml-auto"><span className="hidden text-sm font-medium sm:inline">Rows per page</span><select className="h-8 rounded-md border bg-white px-2 text-sm" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50].map((size) => <option key={size}>{size}</option>)}</select><span className="mx-2 text-sm font-medium">Page {Math.min(page + 1, pages)} of {pages}</span><Button variant="outline" size="icon" className="hidden h-8 w-8 sm:inline-flex" disabled={page === 0} onClick={() => onPageChange(0)}><ChevronsLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages - 1} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="hidden h-8 w-8 sm:inline-flex" disabled={page >= pages - 1} onClick={() => onPageChange(pages - 1)}><ChevronsRight className="h-4 w-4" /></Button></div></div>;
}

export type DetailSection = { title: string; fields: { label: string; value: React.ReactNode }[] };

export function RecordDetailsDialog({ open, onOpenChange, icon: Icon, title, description, badge, sections }: { open: boolean; onOpenChange: (open: boolean) => void; icon: LucideIcon; title: string; description?: string; badge?: React.ReactNode; sections: DetailSection[] }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="grid max-w-2xl grid-rows-[auto_minmax(0,1fr)] gap-0 p-0"><DialogHeader className="border-b px-5 py-4 pr-14 sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted-foreground"><Icon className="h-5 w-5" /></span><div className="min-w-0"><DialogTitle className="truncate">{title}</DialogTitle>{description && <DialogDescription className="mt-1 truncate">{description}</DialogDescription>}</div>{badge && <div className="ml-auto shrink-0">{badge}</div>}</div></DialogHeader><div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">{sections.map((section) => <Card key={section.title} className="rounded-lg shadow-none"><CardHeader className="border-b py-3"><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader><CardContent className="grid gap-x-6 gap-y-5 pt-5 sm:grid-cols-2">{section.fields.map((field) => <dl key={field.label} className="space-y-1"><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt><dd className="min-w-0 break-words text-sm leading-6 text-foreground">{field.value ?? "—"}</dd></dl>)}</CardContent></Card>)}</div></DialogContent></Dialog>;
}

export function pageSlice<T>(items: T[], page: number, pageSize: number) { return items.slice(page * pageSize, page * pageSize + pageSize); }
