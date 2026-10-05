"use client";

import Link from "next/link";
import { ArrowRight, Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";

const links = [
  { label: "Platform", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Developers", href: "#developers" },
  { label: "Security", href: "#security" },
  { label: "Docs", href: "/docs" },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-white/10 bg-[#071a13]/60 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Logo dark />

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-[13px] font-semibold text-white/70 transition-colors hover:text-lime focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime">{link.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <a href="https://github.com/Jamil255/WhatsApp_saas" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 px-3.5 text-xs font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/5"><Github className="h-4 w-4" /> GitHub</a>
          <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime px-4 text-xs font-bold text-ink transition hover:bg-[#c8f5a8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">Sign in <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 text-white lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="public-mobile-nav"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav id="public-mobile-nav" className="mx-5 mb-4 rounded-2xl border border-white/15 bg-[#102b20] p-3 shadow-2xl sm:mx-8 lg:hidden" aria-label="Mobile navigation">
          <div className="grid gap-1">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">{link.label}</Link>)}
            <a href="https://github.com/Jamil255/WhatsApp_saas" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"><Github className="h-4 w-4" /> GitHub</a>
            <Link href="/login" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-bold text-ink">Sign in <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </nav>
      )}
    </header>
  );
}
