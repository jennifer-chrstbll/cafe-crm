"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api, { errorMessage } from "@/services/api";

interface Options {
  /** Poll every N ms (paused while the browser tab is hidden). */
  interval?: number;
  enabled?: boolean;
}

/**
 * Small stale-while-revalidate fetcher:
 *  - `loading` only on the first load (show a skeleton),
 *  - later refreshes keep the old data on screen (no flicker), `refreshing` = true,
 *  - polling pauses when the tab is hidden and refreshes immediately when it comes back.
 */
export function useApi<T>(path: string | null, { interval, enabled = true }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async (silent = false) => {
    const p = pathRef.current;
    if (!p) return;
    if (silent) setRefreshing(true);
    try {
      const r = await api.get<T>(p);
      if (pathRef.current === p) {
        setData(r.data);
        setError(null);
      }
    } catch (e) {
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
    setLoading(true);
    load();
  }, [path, enabled, load]);

  useEffect(() => {
    if (!interval || !path || !enabled) return;
    const tick = () => document.visibilityState === "visible" && load(true);
    const id = setInterval(tick, interval);
    const onVisible = () => document.visibilityState === "visible" && load(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [interval, path, enabled, load]);

  return { data, error, loading, refreshing, reload: () => load(true), setData };
}
