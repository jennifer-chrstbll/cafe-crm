import { NextRequest } from "next/server";
import { db, GUEST_ID, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { PAYMENT_METHODS } from "@/lib/server/payments";
import { closeVisit } from "@/lib/server/visits";

/** Settle a tab. The UNPAID guard makes a double tap harmless (second call gets 409). */
export const POST = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const { payment_method } = await body<{ payment_method?: string }>(req);
  if (!PAYMENT_METHODS.includes(payment_method as never)) throw new ApiError(422, "Pilih metode pembayaran.");

  const sb = db();
  const { data: orders } = await sb.from("orders").select("subtotal").eq("transaction_id", id);
  if (!orders?.length) throw new ApiError(409, "Tagihan ini tidak memiliki item.");
  const total = orders.reduce((s, o) => s + num(o.subtotal), 0);
  const now = new Date().toISOString();

  const { data, error } = await sb.from("transactions")
    .update({ status: "PAID", payment_method, total_amount: total, paid_at: now })
    .eq("transaction_id", id).eq("status", "UNPAID")
    .select("transaction_id, visit_id, visits(customer_id)");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new ApiError(409, "Tagihan ini sudah dibayar.");

  const row: any = data[0];
  if (row.visits?.customer_id === GUEST_ID) await closeVisit(row.visit_id, now);
  return json({ transaction_id: id, total_amount: total, payment_method, paid_at: now });
});
