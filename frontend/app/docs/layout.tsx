import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import { Logo } from "@/components/logo";
import { DocsSearch } from "@/components/docs-search";
import { DocsThemeToggle } from "@/components/docs-theme-toggle";
import { DocsNavigation } from "@/components/docs-navigation";
import "./docs.css";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="docs-page min-h-screen">
    <header className="docs-header sticky top-0 z-40 border-b backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-7"><div className="flex min-w-0 items-center gap-4"><Logo /><span className="docs-divider hidden h-5 w-px sm:block" /><Link href="/docs" className="docs-header-label hidden text-sm font-semibold sm:block">Docs</Link></div><div className="flex items-center gap-2"><DocsSearch /><DocsThemeToggle /><a href="https://github.com/Jamil255/WhatsApp_saas" target="_blank" rel="noreferrer" className="docs-header-link hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold lg:inline-flex"><Github className="h-4 w-4" /> GitHub</a><Link href="/login" className="docs-sign-in inline-flex h-9 items-center rounded-lg px-3.5 text-xs font-bold">Sign in</Link></div></div></header>
    <div className="docs-layout mx-auto grid max-w-[1500px] lg:grid-cols-[244px_minmax(0,1fr)] xl:grid-cols-[244px_minmax(0,1fr)_190px]"><aside className="docs-sidebar hidden border-r px-5 py-8 lg:block"><DocsNavigation /></aside><main id="main-content" className="min-w-0 px-5 pb-20 pt-8 sm:px-9 sm:pt-11 lg:px-12"><div className="mb-6 lg:hidden"><DocsNavigation mobile /></div>{children}</main><aside className="docs-aside hidden border-l px-5 py-9 xl:block"><div className="sticky top-24"><p className="docs-side-label">ON THIS PAGE</p><div id="docs-toc" className="docs-toc mt-4" /><div className="docs-source-card mt-9"><strong>Open source</strong><p>Inspect the backend or contribute a fix.</p><a href="https://github.com/Jamil255/WhatsApp_saas" target="_blank" rel="noreferrer">View repository <ArrowUpRight className="h-3.5 w-3.5" /></a></div></div></aside></div>
    <footer className="docs-footer border-t"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-5 py-7 text-xs sm:px-7"><span>Nexora developer docs</span><span>WhatsApp is a trademark of Meta Platforms, Inc.</span></div></footer>
  </div>;
}
