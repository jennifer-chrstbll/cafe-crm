import { NextRequest } from "next/server";
import { db, fetchAll, GUEST_ID } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { requestGalleryReload } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/** embeddings.model_name written by the current UNO Q program; older rows are ignored by it. */
const CURRENT_MODEL = "mbf-scrfd-v2";

/** Owner: every customer with stored face data, and whether it still works with the device. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const sb = db();
  const embs = await fetchAll<{ customer_id: string; model_name: string; created_at: string }>((a, b) =>
    sb.from("embeddings").select("customer_id, model_name, created_at").order("created_at").range(a, b) as never);
  const by = new Map<string, { photos: number; current: number; enrolled_at: string }>();
  for (const e of embs) {
    const x = by.get(e.customer_id) ?? { photos: 0, current: 0, enrolled_at: e.created_at };
    x.photos += 1;
    if (e.model_name === CURRENT_MODEL) x.current += 1;
    if (e.created_at > x.enrolled_at) x.enrolled_at = e.created_at;
    by.set(e.customer_id, x);
  }
  const ids = [...by.keys()].filter((id) => id !== GUEST_ID);
  const customers = new Map<string, { name: string; phone_number: string | null; is_active: boolean }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from("customers").select("customer_id, name, phone_number, is_active")
      .in("customer_id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const c of data ?? []) customers.set(c.customer_id, c);
  }
  const since = new Date(Date.now() - 365 * 86400_000).toISOString();
  const logs = await fetchAll<{ customer_id: string; created_at: string }>((a, b) =>
    sb.from("recognition_logs").select("customer_id, created_at").eq("recognized", true)
      .gte("created_at", since).order("created_at", { ascending: false }).range(a, b) as never);
  const last = new Map<string, string>();
  for (const l of logs) if (l.customer_id && !last.has(l.customer_id)) last.set(l.customer_id, l.created_at);

  const rows = ids.filter((id) => customers.has(id)).map((id) => {
    const e = by.get(id)!;
    const c = customers.get(id)!;
    return {
      customer_id: id, name: c.name, phone_number: c.phone_number, is_active: c.is_active,
      photos: e.photos, works: e.current > 0, enrolled_at: e.enrolled_at, last_seen_at: last.get(id) ?? null,
    };
  }).sort((a, b) => Number(a.works) - Number(b.works) || a.name.localeCompare(b.name, "id"));
  return json({ rows, total: rows.length, needs_reenroll: rows.filter((r) => !r.works).length });
});

/**
 * Owner: delete face data only (the customer profile and purchase history stay).
 * Body { customer_ids: [...] } or { all: true, confirm: "HAPUS SEMUA" }.
 */
export const DELETE = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const b = await body<{ customer_ids?: unknown; all?: boolean; confirm?: string }>(req);
  const sb = db();
  let ids: string[];
  if (b.all === true) {
    if (b.confirm !== "HAPUS SEMUA") throw new ApiError(422, 'Ketik "HAPUS SEMUA" untuk mengonfirmasi.');
    const embs = await fetchAll<{ customer_id: string }>((a, z) =>
      sb.from("embeddings").select("customer_id").range(a, z) as never);
    ids = [...new Set(embs.map((e) => e.customer_id))];
  } else {
    if (!Array.isArray(b.customer_ids) || !b.customer_ids.length || b.customer_ids.length > 500
        || !b.customer_ids.every(isUuid)) {
      throw new ApiError(400, "Pilih pelanggan yang wajahnya akan dihapus.");
    }
    ids = b.customer_ids as string[];
  }
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const { error } = await sb.from("embeddings").delete().in("customer_id", part);
    if (error) throw new Error(error.message);
    await sb.from("customers").update({ consent_given: false, consent_given_at: null }).in("customer_id", part);
  }
  await requestGalleryReload();
  return json({ deleted_customers: ids.length });
});
