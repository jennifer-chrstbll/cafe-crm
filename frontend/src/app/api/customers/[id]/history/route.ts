import { NextRequest } from "next/server";
import { db, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, isUuid, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Visits of one customer, newest first, each with its orders and payment status. */
export const GET = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const sb = db();
  const { data: visits, error } = await sb
    .from("visits")
    .select("visit_id, entry_time, exit_time, duration_minutes, track_id_aktif")
    .eq("customer_id", id)
    .order("entry_time", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const ids = (visits ?? []).map((v) => v.visit_id);
  const [orders, txs] = ids.length
    ? await Promise.all([
        sb.from("orders").select("visit_id, qty, subtotal, menu(name)").in("visit_id", ids),
        sb.from("transactions").select("visit_id, status, payment_method").in("visit_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  return json((visits ?? []).map((v) => {
    const items = (orders.data ?? []).filter((o: any) => o.visit_id === v.visit_id)
      .map((o: any) => ({ menu_name: o.menu?.name ?? "Item", qty: o.qty, subtotal: num(o.subtotal) }));
    const t = (txs.data ?? []).filter((x: any) => x.visit_id === v.visit_id);
    return {
      ...v, items, total: items.reduce((s, i) => s + i.subtotal, 0),
      unpaid: t.some((x: any) => x.status === "UNPAID"),
      payment_methods: [...new Set(t.filter((x: any) => x.payment_method).map((x: any) => x.payment_method))],
    };
  }));
});
