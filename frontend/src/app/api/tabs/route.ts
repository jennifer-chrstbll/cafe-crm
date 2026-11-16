import { NextRequest } from "next/server";
import { db, GUEST_ID, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Open stay-in tabs (UNPAID transactions), oldest first so nobody is forgotten. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const sb = db();
  if (req.nextUrl.searchParams.get("count")) {
    // Badge in the menu bar: one cheap count instead of every open tab with its items.
    const { count, error } = await sb.from("transactions").select("transaction_id", { count: "exact", head: true })
      .eq("status", "UNPAID");
    if (error) throw new Error(error.message);
    return json({ count: count ?? 0 });
  }
  const { data: txs, error } = await sb.from("transactions")
    .select("transaction_id, visit_id, label, created_at, visits(customer_id, customers(name))")
    .eq("status", "UNPAID")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!txs?.length) return json([]);

  const { data: orders } = await sb.from("orders")
    .select("order_id, transaction_id, qty, subtotal, created_at, menu(name)")
    .in("transaction_id", txs.map((t) => t.transaction_id))
    .order("created_at");

  return json(txs.map((t: any) => {
    const items = (orders ?? []).filter((o: any) => o.transaction_id === t.transaction_id)
      .map((o: any) => ({ order_id: o.order_id, menu_name: o.menu?.name ?? "Item", qty: o.qty,
                          subtotal: num(o.subtotal), created_at: o.created_at }));
    const guest = t.visits?.customer_id === GUEST_ID;
    return {
      transaction_id: t.transaction_id, visit_id: t.visit_id, created_at: t.created_at,
      customer_id: guest ? null : t.visits?.customer_id ?? null,
      name: guest ? (t.label || "Tamu") : (t.visits?.customers?.name ?? "Pelanggan"),
      label: t.label, is_guest: guest,
      items, total_amount: items.reduce((s: number, i: any) => s + i.subtotal, 0),
      minutes_open: Math.round((Date.now() - new Date(t.created_at).getTime()) / 60000),
    };
  }));
});
