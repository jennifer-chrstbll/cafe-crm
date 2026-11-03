import { NextRequest } from "next/server";
import { db, fetchAll, GUEST_ID, num } from "@/lib/db";
import { isOwnerLevel, requireUser } from "@/lib/auth";
import { ApiError, json, route } from "@/lib/server/http";
import { jakartaDateKey, jakartaDayStart } from "@/lib/server/time";

export const dynamic = "force-dynamic";

/**
 * GET /api/transactions?date=YYYY-MM-DD (WIB, default today)
 * Payments received that day + totals per method, for closing the shift.
 * Cashiers can only see today.
 */
export const GET = route(async (req: NextRequest) => {
  const s = await requireUser(req);
  const today = jakartaDateKey(new Date());
  const date = req.nextUrl.searchParams.get("date") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "Format tanggal YYYY-MM-DD.");
  if (date !== today && !isOwnerLevel(s.role)) throw new ApiError(403, "Kasir hanya dapat melihat transaksi hari ini.");

  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 86_400_000);
  if (Number.isNaN(start.getTime())) throw new ApiError(400, "Tanggal tidak valid.");

  const rows = await fetchAll<any>((a, b) => db().from("transactions")
    .select("transaction_id, status, total_amount, payment_method, paid_at, created_at, label, visits(customer_id, customers(name))")
    .eq("status", "PAID")
    .gte("paid_at", start.toISOString()).lt("paid_at", end.toISOString())
    .order("paid_at", { ascending: false }).range(a, b) as never);

  const byMethod: Record<string, { count: number; amount: number }> = {};
  let total = 0;
  const items = rows.map((t) => {
    const amount = num(t.total_amount);
    total += amount;
    const m = t.payment_method ?? "UNKNOWN";
    byMethod[m] = { count: (byMethod[m]?.count ?? 0) + 1, amount: (byMethod[m]?.amount ?? 0) + amount };
    const guest = t.visits?.customer_id === GUEST_ID;
    return {
      transaction_id: t.transaction_id, amount, payment_method: m, paid_at: t.paid_at,
      customer_id: guest ? null : t.visits?.customer_id ?? null,
      name: guest ? (t.label || "Tamu") : (t.visits?.customers?.name ?? "Pelanggan"),
    };
  });
  return json({ date, is_today: date === today, total, count: items.length, by_method: byMethod, items,
                range_start: jakartaDayStart(start).toISOString() });
});
