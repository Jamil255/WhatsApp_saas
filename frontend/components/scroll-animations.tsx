"use client";

import { useEffect } from "react";

/** Adds one-shot, viewport-aware motion to homepage sections. */
export function ScrollAnimations() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) return;

    sections.slice(1).forEach((section) => section.classList.add("section-reveal-ready"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("section-reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -2% 0px" },
    );

    sections.slice(1).forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return null;
}
