import { createAdminClient } from "./supabase";

export function db() {
  return createAdminClient();
}

/** Walk-in guest customer created by migration 004 (excluded from analytics and CF). */
export const GUEST_ID = "00000000-0000-0000-0000-000000000001";

/** Segment by number of visits (same thresholds everywhere). */
export function getSegment(visitCount: number): "VIP" | "Regular" | "New" {
  if (visitCount >= 15) return "VIP";
  if (visitCount >= 5) return "Regular";
  return "New";
}

type Page<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Supabase returns at most 1000 rows per request. Page through a query so
 * totals and analytics are never silently truncated.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize = 1000,
  maxRows = 50_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};
