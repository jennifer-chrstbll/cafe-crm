import { NextRequest } from "next/server";
import { db, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, isUuid, json, route } from "@/lib/server/http";
import { invalidateCustomerContext } from "@/lib/server/customers";

/** Remove a wrongly entered item from an UNPAID tab (paid transactions are locked). */
export const DELETE = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id, orderId } = await ctx.params;
  if (!isUuid(id) || !isUuid(orderId)) throw new ApiError(400, "ID tidak valid.");
  const sb = db();
  const { data: tx } = await sb.from("transactions").select("status").eq("transaction_id", id).maybeSingle();
  if (!tx) throw new ApiError(404, "Tagihan tidak ditemukan.");
  if (tx.status !== "UNPAID") throw new ApiError(409, "Tagihan yang sudah dibayar tidak bisa diubah.");

  const { error } = await sb.from("orders").delete().eq("order_id", orderId).eq("transaction_id", id);
  if (error) throw new Error(error.message);
  const { data: rest } = await sb.from("orders").select("subtotal").eq("transaction_id", id);
  const total = (rest ?? []).reduce((s, o) => s + num(o.subtotal), 0);
  await sb.from("transactions")
    .update(rest?.length ? { total_amount: total } : { total_amount: 0, status: "CANCELLED" })
    .eq("transaction_id", id);
  invalidateCustomerContext();
  return json({ total_amount: total, cancelled: !rest?.length });
});
