"use client";

import { useEffect } from "react";

/** Provider-neutral, local-only Web Vitals observation. Nothing is transmitted. */
export function PerformanceObserverClient() {
  useEffect(() => {
    if (!("PerformanceObserver" in window)) return;
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (entry.duration < 250) continue;
        window.dispatchEvent(new CustomEvent("blocksystem:performance", { detail: { type: entry.entryType, duration: Math.round(entry.duration) } }));
      }
    });
    try { observer.observe({ type: "longtask", buffered: true }); } catch { /* Unsupported entries are optional. */ }
    return () => observer.disconnect();
  }, []);
  return null;
}
