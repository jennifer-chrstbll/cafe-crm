import { NextRequest } from "next/server";
import { db, fetchAll, GUEST_ID, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings";
import { jakartaDayStart, jakartaHour } from "@/lib/server/time";
import { closeStaleVisits } from "@/lib/server/visits";

export const dynamic = "force-dynamic";

/** Owner's "today at a glance": money, people, floors, best sellers, things that need attention. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  closeStaleVisits().catch(() => undefined);
  const sb = db();
  const settings = await getSettings();
  const today = jakartaDayStart();
  const yesterday = jakartaDayStart(new Date(), 1);
  const sameTimeYesterday = new Date(Date.now() - 86_400_000);

  const [paid, paidYesterday, visits, newCustomers, tabs, occupancy, devices, todayOrders] = await Promise.all([
    fetchAll<any>((a, b) => sb.from("transactions").select("total_amount, paid_at").eq("status", "PAID")
      .gte("paid_at", today.toISOString()).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("transactions").select("total_amount").eq("status", "PAID")
      .gte("paid_at", yesterday.toISOString()).lt("paid_at", sameTimeYesterday.toISOString()).range(a, b) as never),
    fetchAll<any>((a, b) => sb.from("visits").select("customer_id").neq("customer_id", GUEST_ID)
      .gte("entry_time", today.toISOString()).range(a, b) as never),
    sb.from("customers").select("customer_id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    sb.from("transactions").select("transaction_id, total_amount, created_at").eq("status", "UNPAID"),
    sb.from("occupancy").select("camera_id, floor, person_count, updated_at"),
    sb.from("device_status").select("device_id, kind, last_seen_at"),
    fetchAll<any>((a, b) => sb.from("orders").select("menu_id, qty, subtotal, menu(name)")
      .gte("created_at", today.toISOString()).range(a, b) as never),
  ]);

  const revenue = paid.reduce((s, t) => s + num(t.total_amount), 0);
  const revenueYesterday = paidYesterday.reduce((s, t) => s + num(t.total_amount), 0);
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0 }));
  for (const t of paid) hourly[jakartaHour(t.paid_at)].revenue += num(t.total_amount);

  const sellers = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of todayOrders) {
    const s = sellers.get(o.menu_id) ?? { name: o.menu?.name ?? "Menu", qty: 0, revenue: 0 };
    s.qty += o.qty;
    s.revenue += num(o.subtotal);
    sellers.set(o.menu_id, s);
  }

  // Returning today = visited today and had a visit before today.
  const todayIds = [...new Set(visits.map((v) => v.customer_id))];
  let returning = 0;
  if (todayIds.length) {
    const { data: before } = await sb.from("visits").select("customer_id")
      .in("customer_id", todayIds).lt("entry_time", today.toISOString());
    returning = new Set((before ?? []).map((v) => v.customer_id)).size;
  }

  const floors = settings.cafe.floors.map((f) => {
    const rows = (occupancy.data ?? []).filter((o) => o.floor === f.floor);
    const updated = rows.map((r) => r.updated_at).sort().pop() ?? null;
    return {
      floor: f.floor, capacity: f.capacity,
      count: rows.reduce((s, r) => s + (r.person_count ?? 0), 0),
      updated_at: updated,
      stale: !updated || Date.now() - new Date(updated).getTime() > 120_000,
    };
  });

  const openTabs = tabs.data ?? [];
  const alerts: { level: "warning" | "danger"; text: string; href?: string }[] = [];
  for (const d of devices.data ?? []) {
    if (Date.now() - new Date(d.last_seen_at).getTime() > 90_000) {
      alerts.push({ level: "danger", text: `Perangkat ${d.device_id} offline`, href: "/settings" });
    }
  }
  const longTabs = openTabs.filter((t) => Date.now() - new Date(t.created_at).getTime() > 3 * 3600_000).length;
  if (longTabs) alerts.push({ level: "warning", text: `${longTabs} tagihan terbuka lebih dari 3 jam`, href: "/unpaid" });
  if (!(devices.data ?? []).length) alerts.push({ level: "warning", text: "Belum ada perangkat kamera yang terhubung", href: "/settings" });

  return json({
    revenue_today: revenue,
    revenue_yesterday_same_time: revenueYesterday,
    transactions_today: paid.length,
    avg_ticket: paid.length ? revenue / paid.length : 0,
    visits_today: visits.length,
    customers_today: todayIds.length,
    returning_today: returning,
    new_customers_today: newCustomers.count ?? 0,
    open_tabs: openTabs.length,
    open_tabs_amount: openTabs.reduce((s, t) => s + num(t.total_amount), 0),
    floors,
    hourly,
    top_sellers: [...sellers.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    alerts,
  });
});
