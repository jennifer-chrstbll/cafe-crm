"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import api, { errorMessage } from "@/services/api";

interface Options {
  /** Poll every N ms (paused while the tab is hidden or the device is offline). */
  interval?: number;
  enabled?: boolean;
}

/**
 * Stale-while-revalidate fetcher with a shared in-memory cache.
 *
 *  - Pages show the last known data instantly when you come back to them (no skeleton,
 *    no waiting); a background refresh updates it (Nielsen #1, Doherty threshold < 400 ms).
 *  - Two components asking for the same path at the same time share ONE request.
 *  - Polling pauses while the browser tab is hidden or the device is offline, and backs off
 *    after errors (2x, max 60 s) so a weak connection is not flooded with requests.
 */
type Entry = { data: unknown; at: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 80;

function fetchShared<T>(path: string, force = false): Promise<T> {
  // After a change (reload) a request that started before it may hold old data: don't reuse it.
  const running = force ? undefined : inflight.get(path);
  if (running) return running as Promise<T>;
  const p = api.get<T>(path).then((r) => {
    cache.set(path, { data: r.data, at: Date.now() });
    if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
    return r.data;
  }).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/** Forget cached responses (e.g. after logout) or those starting with a prefix (after a change). */
export function invalidateApi(prefix = "") {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
/** true while the browser has a network connection. */
export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function useApi<T>(path: string | null, { interval, enabled = true }: Options = {}) {
  const cached = path ? (cache.get(path)?.data as T | undefined) : undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;
  const failures = useRef(0);

  const load = useCallback(async (silent = false, force = false) => {
    const p = pathRef.current;
    if (!p) return;
    if (silent) setRefreshing(true);
    try {
      const d = await fetchShared<T>(p, force);
      if (pathRef.current === p) {
        setData(d);
        setError(null);
        failures.current = 0;
      }
    } catch (e) {
      failures.current += 1;
      // Keep showing the last good data; the error only shows when there is nothing to show.
      if (pathRef.current === p) setError(errorMessage(e, "Gagal memuat data."));
    } finally {
      if (pathRef.current === p) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!path || !enabled) return;
    const c = cache.get(path);
    if (c) {
      setData(c.data as T);
      setLoading(false);
      if (Date.now() - c.at > 5000) load(true);      // fresh (< 5 s): no refetch at all
    } else {
      setData(null);
      setLoading(true);
      load();
    }
  }, [path, enabled, load]);

  useEffect(() => {
    if (!interval || !path || !enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState === "visible" && navigator.onLine) await load(true);
      if (stop) return;
      const wait = failures.current ? Math.min(60_000, interval * 2 ** Math.min(failures.current, 5)) : interval;
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, interval);
    const onVisible = () => { if (document.visibilityState === "visible") load(true); };
    const onOnline = () => { failures.current = 0; load(true); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [interval, path, enabled, load]);

  const setAndCache = useCallback((v: T | null | ((prev: T | null) => T | null)) => {
    setData((prev) => {
      const next = typeof v === "function" ? (v as (p: T | null) => T | null)(prev) : v;
      if (pathRef.current && next != null) cache.set(pathRef.current, { data: next, at: Date.now() });
      return next;
    });
  }, []);

  return { data, error: data ? null : error, stale: !!error && !!data, loading, refreshing,
           reload: () => load(true, true), setData: setAndCache };
}
