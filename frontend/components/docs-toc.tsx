"use client";

import { createPortal } from "react-dom";

export function DocsToc({ sections }: { sections: { id: string; title: string }[] }) {
  const target = typeof document !== "undefined" ? document.getElementById("docs-toc") : null;
  if (!target) return null;
  return createPortal(<nav aria-label="On this page">{sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav>, target);
}
