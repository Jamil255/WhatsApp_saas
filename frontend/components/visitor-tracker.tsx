"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";

const excludedPrefixes = ["/admin", "/dashboard", "/docs", "/login"];

function getOrCreateId(storage: Storage, key: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID();
  storage.setItem(key, next);
  return next;
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (excludedPrefixes.some((prefix) => pathname.startsWith(prefix))) return;
    if (navigator.doNotTrack === "1") return;

    const search = window.location.search;
    const path = `${pathname}${search}`.slice(0, 500);
    const visitKey = `nexora:last-track:${path}`;
    if (window.sessionStorage.getItem(visitKey)) return;
    window.sessionStorage.setItem(visitKey, new Date().toISOString());

    const params = new URLSearchParams(search);
    void apiFetch("/visitors/track", {
      method: "POST",
      auth: false,
      keepalive: true,
      body: JSON.stringify({
        visitorId: getOrCreateId(window.localStorage, "nexora:visitor-id"),
        sessionId: getOrCreateId(window.sessionStorage, "nexora:session-id"),
        path,
        referrer: document.referrer || undefined,
        utmSource: params.get("utm_source") || undefined,
        utmMedium: params.get("utm_medium") || undefined,
        utmCampaign: params.get("utm_campaign") || undefined,
      }),
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
