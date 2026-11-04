import { NextRequest } from "next/server";
import { db, fetchAll } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings";
import { requestGalleryReload } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/**
 * Storage limitation (UU PDP No. 27/2022): face embeddings of customers who have not
 * visited for `retention_days` are deleted. Their profile and purchase history stay.
 */
async function candidates(days: number) {
  const sb = db();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const [embs, recent] = await Promise.all([
    fetchAll<{ customer_id: string; created_at: string }>((a, b) =>
      sb.from("embeddings").select("customer_id, created_at").not("customer_id", "is", null).range(a, b) as never),
    fetchAll<{ customer_id: string }>((a, b) =>
      sb.from("visits").select("customer_id").gte("entry_time", cutoff).range(a, b) as never),
  ]);
  const active = new Set(recent.map((v) => v.customer_id));
  const stale = [...new Set(embs.filter((e) => e.created_at < cutoff && !active.has(e.customer_id)).map((e) => e.customer_id))];
  return { embs, stale, oldest: embs.map((e) => e.created_at).sort()[0] ?? null };
}

export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const days = Number(req.nextUrl.searchParams.get("days")) || (await getSettings()).privacy.retention_days;
  const c = await candidates(days);
  return json({
    retention_days: days,
    embeddings: c.embs.length,
    customers_with_face: new Set(c.embs.map((e) => e.customer_id)).size,
    to_delete_customers: c.stale.length,
    oldest_embedding: c.oldest,
  });
});

export const POST = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const { days } = await body<{ days?: number }>(req);
  if (!Number.isInteger(days) || days! < 7 || days! > 730) throw new ApiError(422, "Masa retensi 7–730 hari.");
  const c = await candidates(days!);
  if (c.stale.length) {
    const { error } = await db().from("embeddings").delete().in("customer_id", c.stale);
    if (error) throw new Error(error.message);
    await db().from("customers").update({ consent_given: false }).in("customer_id", c.stale);
    await requestGalleryReload();
  }
  return json({ deleted_customers: c.stale.length });
});
