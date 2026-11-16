import { NextRequest } from "next/server";
import { db, GUEST_ID, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { PAYMENT_METHODS } from "@/lib/server/payments";
import { invalidateRecommendations } from "@/lib/server/recommendation";
import { closeVisit, getOrCreateActiveVisit } from "@/lib/server/visits";
import { invalidateCustomerContext } from "@/lib/server/customers";

interface OrderBody {
  customer_id?: string | null;      // null / absent = walk-in guest
  items?: { menu_id: string; qty: number }[];
  mode?: "pay_now" | "tab";         // pay at the counter, or add to a stay-in tab
  payment_method?: string;
  label?: string;                   // tab label for guests, e.g. "Meja 4"
}

/**
 * POST /api/orders
 * Prices come from the database (never from the browser). Every order line belongs to
 * exactly one transaction: a new PAID one (pay_now) or the visit's single UNPAID tab.
 */
export const POST = route(async (req: NextRequest) => {
  const session = await requireUser(req);
  const b = await body<OrderBody>(req);
  const mode = b.mode === "tab" ? "tab" : "pay_now";
  const items = (b.items ?? []).filter((i) => isUuid(i.menu_id) && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 99);
  if (!items.length || items.length !== (b.items ?? []).length || items.length > 50) {
    throw new ApiError(422, "Keranjang kosong atau jumlah item tidak valid.");
  }
  if (mode === "pay_now" && !PAYMENT_METHODS.includes(b.payment_method as never)) {
    throw new ApiError(422, "Pilih metode pembayaran.");
  }
  const customerId = b.customer_id || GUEST_ID;
  const isGuest = customerId === GUEST_ID;
  if (isGuest && mode === "tab" && !b.label?.trim()) {
    throw new ApiError(422, "Beri nama/nomor meja untuk tagihan tamu.");
  }
  const sb = db();

  if (!isGuest) {
    if (!isUuid(customerId)) throw new ApiError(400, "ID pelanggan tidak valid.");
    const { data: c } = await sb.from("customers").select("customer_id").eq("customer_id", customerId).eq("is_active", true).maybeSingle();
    if (!c) throw new ApiError(404, "Pelanggan tidak ditemukan.");
  }

  const { data: menus, error: menuErr } = await sb.from("menu").select("menu_id, name, price")
    .in("menu_id", items.map((i) => i.menu_id)).eq("is_active", true);
  if (menuErr) throw new Error(menuErr.message);
  const price = new Map((menus ?? []).map((m) => [m.menu_id, { name: m.name, price: num(m.price) }]));
  const missing = items.find((i) => !price.has(i.menu_id));
  if (missing) throw new ApiError(409, "Ada menu yang sudah tidak tersedia. Muat ulang menu.");

  const now = new Date().toISOString();
  const visit = isGuest
    ? (await sb.from("visits").insert({ customer_id: GUEST_ID, entry_time: now }).select("visit_id").single()).data!
    : await getOrCreateActiveVisit(customerId);

  // Transaction: reuse the visit's open tab, or create one.
  let txId: string | null = null;
  let createdTx = false;
  if (mode === "tab") {
    const { data: open } = await sb.from("transactions").select("transaction_id")
      .eq("visit_id", visit.visit_id).eq("status", "UNPAID").maybeSingle();
    txId = open?.transaction_id ?? null;
  }
  if (!txId) {
    const { data: tx, error } = await sb.from("transactions").insert({
      visit_id: visit.visit_id,
      status: mode === "tab" ? "UNPAID" : "PAID",
      total_amount: 0,
      payment_method: mode === "tab" ? null : b.payment_method,
      paid_at: mode === "tab" ? null : now,
      label: b.label?.trim() || null,
      created_by: session.sub,
      created_at: now,
    }).select("transaction_id").single();
    if (error) throw new Error(error.message);
    txId = tx.transaction_id;
    createdTx = true;
  }

  const rows = items.map((i) => ({
    visit_id: visit.visit_id, transaction_id: txId, menu_id: i.menu_id, qty: i.qty,
    subtotal: price.get(i.menu_id)!.price * i.qty, created_at: now,
  }));
  const { error: orderErr } = await sb.from("orders").insert(rows);
  if (orderErr) {
    if (createdTx) await sb.from("transactions").delete().eq("transaction_id", txId);
    throw new Error(orderErr.message);
  }

  const { data: all } = await sb.from("orders").select("subtotal").eq("transaction_id", txId);
  const total = (all ?? []).reduce((s, o) => s + num(o.subtotal), 0);
  await sb.from("transactions").update({ total_amount: total }).eq("transaction_id", txId);
  if (isGuest && mode === "pay_now") await closeVisit(visit.visit_id, now, "PAID");
  invalidateRecommendations();

  invalidateCustomerContext();

  return json({
    transaction_id: txId, visit_id: visit.visit_id, status: mode === "tab" ? "UNPAID" : "PAID",
    total_amount: total, added_amount: rows.reduce((s, r) => s + r.subtotal, 0),
    items: items.map((i) => ({ name: price.get(i.menu_id)!.name, qty: i.qty, subtotal: price.get(i.menu_id)!.price * i.qty })),
  }, 201);
});
