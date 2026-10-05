"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, FileText, Search, X } from "lucide-react";
import { docsArticles } from "@/lib/docs-content";

type SearchItem = {
  key: string;
  href: string;
  title: string;
  description: string;
  group: string;
  search: string;
  kind: "page" | "section";
};

const items: SearchItem[] = docsArticles.flatMap((article) => [
  {
    key: article.slug,
    href: `/docs/${article.slug}`,
    title: article.title,
    description: article.description,
    group: article.group,
    search: `${article.title} ${article.description} ${article.keywords}`,
    kind: "page" as const,
  },
  ...article.sections.map((section) => ({
    key: `${article.slug}-${section.id}`,
    href: `/docs/${article.slug}#${section.id}`,
    title: section.title,
    description: section.endpoint?.path ?? section.description,
    group: article.title,
    search: `${section.title} ${section.description} ${section.endpoint?.path ?? ""} ${section.endpoint?.fields?.join(" ") ?? ""}`,
    kind: "section" as const,
  })),
]);

const suggestedSlugs = ["why-nexora", "quickstart", "authentication", "sessions", "messaging", "webhooks"];
const suggestions = suggestedSlugs.flatMap((slug) => items.filter((item) => item.key === slug));

function Highlight({ value, query }: { value: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return <>{value}</>;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return <>{value.split(pattern).map((part, index) =>
    terms.some((term) => part.toLowerCase() === term.toLowerCase())
      ? <mark key={index}>{part}</mark>
      : part,
  )}</>;
}

export function DocsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return suggestions;
    return items
      .filter((item) => terms.every((term) => item.search.toLowerCase().includes(term)))
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(terms[0]);
        const bTitle = b.title.toLowerCase().includes(terms[0]);
        if (aTitle !== bTitle) return aTitle ? -1 : 1;
        return a.kind === b.kind ? 0 : a.kind === "page" ? -1 : 1;
      })
      .slice(0, 8);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  function select(item: SearchItem) {
    setOpen(false);
    router.push(item.href);
    if (item.href.includes("#")) {
      const sectionId = item.href.split("#")[1];
      window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView(), 150);
    }
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      select(results[active]);
    }
  }

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button, input");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const portalTarget = typeof document !== "undefined" ? document.querySelector(".docs-page") : null;

  return <>
    <button ref={triggerRef} type="button" className="docs-search-trigger" onClick={() => setOpen(true)} aria-label="Search documentation" aria-haspopup="dialog" aria-expanded={open}>
      <Search className="h-4 w-4" /><span>Search documentation</span><kbd>Ctrl K</kbd>
    </button>
    {open && portalTarget && createPortal(
      <div className="docs-search-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div ref={dialogRef} className="docs-search-panel" role="dialog" aria-modal="true" aria-label="Search documentation" onKeyDown={trapFocus}>
          <div className="docs-search-input">
            <Search className="h-5 w-5" aria-hidden="true" />
            <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onInputKeyDown} placeholder="Search docs, endpoints, topics..." aria-label="Search documentation" autoComplete="off" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close search"><X className="h-4 w-4" /></button>
          </div>
          <div className="docs-search-results">
            <div className="docs-search-results-heading"><span>{query.trim() ? "Results" : "Popular in docs"}</span><span role="status" aria-live="polite">{query.trim() ? `${results.length} found` : "Start here"}</span></div>
            {results.length ? results.map((item, index) => <button type="button" key={item.key} onMouseEnter={() => setActive(index)} onClick={() => select(item)} className={index === active ? "active" : ""}>
              <span className="docs-search-result-icon"><FileText className="h-4 w-4" /></span>
              <span className="docs-search-result-content"><strong><Highlight value={item.title} query={query} /></strong><small>{item.group}{item.kind === "section" ? " · Section" : " · Guide"}</small>{query.trim() && <em><Highlight value={item.description} query={query} /></em>}</span>
              <ArrowUpRight className="docs-search-result-arrow h-4 w-4" />
            </button>) : <div className="docs-search-empty"><strong>No matching documentation</strong><p>Try “webhook”, “session”, or an endpoint path.</p></div>}
          </div>
          <div className="docs-search-help"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>
        </div>
      </div>,
      portalTarget,
    )}
  </>;
}
