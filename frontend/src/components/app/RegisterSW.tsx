"use client";

import { useEffect } from "react";

/** Registers the service worker (installable app + offline page). Production only. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* the site works without it */ });
  }, []);
  return null;
}
