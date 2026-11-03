import { NextRequest } from "next/server";
import { db, fetchAll, getSegment, GUEST_ID, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { jakartaDateKey, jakartaDayStart, jakartaHour, jakartaWeekday } from "@/lib/server/time";

export const dynamic = "force-dynamic";

/** GET /api/analytics/overview?days=7|30|90 — everything the Analitik page shows, in one request. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("days")))
    ? Number(req.nextUrl.searchParams.get("days")) : 30;
  const since = jakartaDayStart(new Date(), days - 1);
  const sb = db();

  const [txs, orders, visits, allVisits, logs, customers] = await Promise.all([
    fetchAll<any>((a, b) => sb.from("transactions").select("total_amount, paid_at, visits(customer_id)")
      .eq("status", "PAID").gte("paid_at", since.toISOString()).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("orders").select("menu_id, qty, subtotal, created_at, menu(name, category)")
      .gte("created_at", since.toISOString()).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("visits").select("customer_id, entry_time, duration_minutes")
      .neq("customer_id", GUEST_ID).gte("entry_time", since.toISOString()).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("visits").select("customer_id").neq("customer_id", GUEST_ID).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("recognition_logs").select("recognized, is_correct")
      .gte("created_at", since.toISOString()).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("customers").select("customer_id, name").eq("is_active", true)
      .neq("customer_id", GUEST_ID).range(a, b) as never),
  ]);

  // Daily series (every day present, even with zero).
  const daily = new Map<string, { date: string; revenue: number; transactions: number; visits: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = jakartaDateKey(jakartaDayStart(new Date(), i));
    daily.set(key, { date: key, revenue: 0, transactions: 0, visits: 0 });
  }
  for (const t of txs) {
    const d = daily.get(jakartaDateKey(t.paid_at));
    if (d) { d.revenue += num(t.total_amount); d.transactions++; }
  }
  for (const v of visits) {
    const d = daily.get(jakartaDateKey(v.entry_time));
    if (d) d.visits++;
  }

  // Busy times: orders per weekday x hour (heatmap) and per hour.
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const o of orders) heat[jakartaWeekday(o.created_at)][jakartaHour(o.created_at)] += o.qty;
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, qty: heat.reduce((s, row) => s + row[h], 0) }));

  // Products & categories.
  const products = new Map<string, { name: string; category: string; qty: number; revenue: number }>();
  const categories = new Map<string, number>();
  for (const o of orders) {
    const p = products.get(o.menu_id) ?? { name: o.menu?.name ?? "Menu", category: o.menu?.category ?? "-", qty: 0, revenue: 0 };
    p.qty += o.qty;
    p.revenue += num(o.subtotal);
    products.set(o.menu_id, p);
    categories.set(p.category, (categories.get(p.category) ?? 0) + num(o.subtotal));
  }

  // Customers: returning rate in the period, segments (all time), top customers.
  const perCustomer = new Map<string, number>();
  for (const v of visits) perCustomer.set(v.customer_id, (perCustomer.get(v.customer_id) ?? 0) + 1);
  const totalVisits = new Map<string, number>();
  for (const v of allVisits) totalVisits.set(v.customer_id, (totalVisits.get(v.customer_id) ?? 0) + 1);
  const segments = { VIP: 0, Regular: 0, New: 0 } as Record<string, number>;
  for (const c of customers) segments[getSegment(totalVisits.get(c.customer_id) ?? 0)]++;
  const spend = new Map<string, number>();
  for (const t of txs) {
    const c = t.visits?.customer_id;
    if (c && c !== GUEST_ID) spend.set(c, (spend.get(c) ?? 0) + num(t.total_amount));
  }
  const names = new Map(customers.map((c) => [c.customer_id, c.name]));
  const visitors = perCustomer.size;
  const returning = [...perCustomer.values()].filter((n) => n >= 2).length;
  const durations = visits.map((v) => v.duration_minutes).filter((d) => typeof d === "number" && d > 0);
  const checked = logs.filter((l) => l.is_correct !== null);

  const revenue = txs.reduce((s, t) => s + num(t.total_amount), 0);
  return json({
    days,
    totals: {
      revenue, transactions: txs.length, avg_ticket: txs.length ? revenue / txs.length : 0,
      visits: visits.length, visitors, returning_rate: visitors ? returning / visitors : 0,
      avg_duration_min: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      guest_share: txs.length ? txs.filter((t) => t.visits?.customer_id === GUEST_ID).length / txs.length : 0,
    },
    daily: [...daily.values()],
    hours,
    heatmap: heat,
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    categories: [...categories.entries()].map(([category, revenue]) => ({ category, revenue })),
    segments: Object.entries(segments).map(([segment, count]) => ({ segment, count })),
    top_customers: [...perCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id, n]) => ({ customer_id: id, name: names.get(id) ?? "Pelanggan", visits: n, spend: spend.get(id) ?? 0 })),
    recognition: {
      events: logs.length, known: logs.filter((l) => l.recognized).length,
      checked: checked.length,
      precision: checked.length ? checked.filter((l) => l.is_correct).length / checked.length : null,
    },
  });
});
