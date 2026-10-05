import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5faf6] px-6 text-center"><Logo /><div className="mt-16 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-primary"><SearchX className="h-7 w-7" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-primary">404</p><h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-.05em] text-ink">This page wandered off.</h1><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">The page you’re looking for doesn’t exist or may have moved.</p><Button asChild className="mt-7"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to home</Link></Button></div>;
}
