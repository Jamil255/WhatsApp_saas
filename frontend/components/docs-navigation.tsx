"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { docsArticles, docsGroups } from "@/lib/docs-content";

export function DocsNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  if (mobile) return <div className="docs-mobile-nav"><label htmlFor="docs-mobile-select">Browse documentation</label><select id="docs-mobile-select" value={pathname} onChange={(event) => router.push(event.target.value)}><option value="/docs">Overview</option>{docsGroups.map((group) => <optgroup key={group} label={group}>{docsArticles.filter((article) => article.group === group).map((article) => <option value={`/docs/${article.slug}`} key={article.slug}>{article.title}</option>)}</optgroup>)}</select></div>;
  return <nav aria-label="Documentation" className="sticky top-24 space-y-7"><div><p className="docs-side-label">OVERVIEW</p><Link href="/docs" aria-current={pathname === "/docs" ? "page" : undefined} className={`docs-nav-link ${pathname === "/docs" ? "active" : ""}`}>Introduction</Link></div>{docsGroups.map((group) => <div key={group}><p className="docs-side-label">{group.toUpperCase()}</p>{docsArticles.filter((article) => article.group === group).map((article) => <Link href={`/docs/${article.slug}`} key={article.slug} aria-current={pathname === `/docs/${article.slug}` ? "page" : undefined} className={`docs-nav-link ${pathname === `/docs/${article.slug}` ? "active" : ""}`}>{article.title}</Link>)}</div>)}</nav>;
}
