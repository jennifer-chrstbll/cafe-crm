import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const supabase = db();
    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: totalCustomers },
      { count: newCustomersToday },
      { count: todayVisits },
      { count: recognizedToday },
      { count: unknownToday },
      { count: activeOccupancy },
      { count: totalOrders },
    ] = await Promise.all([
      supabase.from("customers").select("customer_id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("customers").select("customer_id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`),
      supabase.from("visits").select("visit_id", { count: "exact", head: true }).gte("entry_time", `${today}T00:00:00`),
      supabase.from("recognition_logs").select("log_id", { count: "exact", head: true }).eq("recognized", true).gte("created_at", `${today}T00:00:00`),
      supabase.from("recognition_logs").select("log_id", { count: "exact", head: true }).eq("recognized", false).gte("created_at", `${today}T00:00:00`),
      supabase.from("visits").select("visit_id", { count: "exact", head: true }).is("exit_time", null),
      supabase.from("orders").select("order_id", { count: "exact", head: true }),
    ]);

    // Today's revenue & total revenue
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("qty, subtotal, menu(name, category)")
      .gte("created_at", `${today}T00:00:00`);

    const todayRevenue = (todayOrders ?? []).reduce(
      (sum: number, r: any) => sum + parseFloat(r.subtotal ?? 0), 0
    );

    const { data: allOrders } = await supabase
      .from("orders")
      .select("subtotal");

    const totalRevenue = (allOrders ?? []).reduce(
      (sum: number, r: any) => sum + parseFloat(r.subtotal ?? 0), 0
    );

    // Top selling items today
    const itemSales: Record<string, { name: string; category: string; qty: number; total: number }> = {};
    for (const row of todayOrders ?? []) {
      const name = (row as any).menu?.name ?? "Menu";
      const cat = (row as any).menu?.category ?? "COFFEE";
      if (!itemSales[name]) {
        itemSales[name] = { name, category: cat, qty: 0, total: 0 };
      }
      itemSales[name].qty += row.qty;
      itemSales[name].total += parseFloat(row.subtotal);
    }

    const topSellers = Object.values(itemSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    // Person tracking floor breakdown simulation based on active visits
    const totalPeople = Math.max(activeOccupancy ?? 0, 4); // minimum active visitors for live demo
    const floor1Count = Math.ceil(totalPeople * 0.6);
    const floor2Count = Math.floor(totalPeople * 0.4);

    return NextResponse.json({
      total_customers: totalCustomers ?? 0,
      new_customers_today: newCustomersToday ?? 0,
      today_visits: todayVisits ?? 0,
      recognized_today: recognizedToday ?? 0,
      unknown_today: unknownToday ?? 0,
      total_orders: totalOrders ?? 0,
      today_revenue: todayRevenue,
      total_revenue: totalRevenue,
      active_occupancy: totalPeople,
      floor1_count: floor1Count,
      floor2_count: floor2Count,
      top_sellers: topSellers,
    });
  } catch (e) {
    console.error("[/api/analytics/dashboard]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
