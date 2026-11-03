import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { jakartaDayStart } from "@/lib/server/time";

export const dynamic = "force-dynamic";

/**
 * Audit trail of the cashier camera + field accuracy from cashier feedback
 * ("Benar" / "Bukan dia"): the evidence for Rank-1 / FAR in the field test.
 */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const p = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(p.get("limit") ?? "25"), 200);
  const offset = Math.max(parseInt(p.get("offset") ?? "0"), 0);
  const days = Math.min(Math.max(parseInt(p.get("days") ?? "7"), 1), 365);
  const since = jakartaDayStart(new Date(), days - 1).toISOString();
  const status = p.get("status"); // known | unknown | wrong | unchecked

  const sb = db();
  let q = sb
    .from("recognition_logs")
    .select("log_id, customer_id, similarity_score, recognized, is_correct, camera_id, model_used, created_at, customers(name)",
            { count: "exact" })
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status === "known") q = q.eq("recognized", true);
  if (status === "unknown") q = q.eq("recognized", false);
  if (status === "wrong") q = q.eq("is_correct", false);
  if (status === "unchecked") q = q.eq("recognized", true).is("is_correct", null);
  const { data, count, error } = await q;
  if (error) throw new Error(error.message);

  const head = (f: (x: any) => any) =>
    f(sb.from("recognition_logs").select("log_id", { count: "exact", head: true }).gte("created_at", since));
  const [all, known, correct, wrong] = await Promise.all([
    head((x) => x),
    head((x) => x.eq("recognized", true)),
    head((x) => x.eq("recognized", true).eq("is_correct", true)),
    head((x) => x.eq("is_correct", false)),
  ]);
  const checked = (correct.count ?? 0) + (wrong.count ?? 0);

  return json({
    total: count ?? 0,
    items: (data ?? []).map((r: any) => ({ ...r, customer_name: r.customers?.name ?? null, customers: undefined })),
    summary: {
      events: all.count ?? 0,
      known: known.count ?? 0,
      unknown: (all.count ?? 0) - (known.count ?? 0),
      confirmed_correct: correct.count ?? 0,
      confirmed_wrong: wrong.count ?? 0,
      precision: checked ? (correct.count ?? 0) / checked : null,
    },
  });
});
