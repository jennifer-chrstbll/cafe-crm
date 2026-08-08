import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const supabase = db();
    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: totalCustomers },
      { count: todayVisits },
      { count: recognizedToday },
      { count: unknownToday },
      { count: totalOrders },
    ] = await Promise.all([
      supabase.from("customers").select("customer_id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("visits").select("visit_id", { count: "exact", head: true })
        .gte("entry_time", `${today}T00:00:00`),
      supabase.from("recognition_logs").select("log_id", { count: "exact", head: true })
        .eq("recognized", true).gte("created_at", `${today}T00:00:00`),
      supabase.from("recognition_logs").select("log_id", { count: "exact", head: true })
        .eq("recognized", false).gte("created_at", `${today}T00:00:00`),
      supabase.from("orders").select("order_id", { count: "exact", head: true }),
    ]);

    // Total revenue
    const { data: revenueRows } = await supabase
      .from("orders")
      .select("subtotal");

    const totalRevenue = (revenueRows ?? []).reduce(
      (sum: number, r: any) => sum + parseFloat(r.subtotal ?? 0), 0
    );

    return NextResponse.json({
      total_customers: totalCustomers ?? 0,
      today_visits: todayVisits ?? 0,
      recognized_today: recognizedToday ?? 0,
      unknown_today: unknownToday ?? 0,
      total_orders: totalOrders ?? 0,
      total_revenue: totalRevenue,
    });
  } catch (e) {
    console.error("[/api/analytics/dashboard]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
