import { NextRequest, NextResponse } from "next/server";
import { db, getSegment } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const supabase = db();

    // Get the most recent recognition log
    const { data: logs, error } = await supabase
      .from("recognition_logs")
      .select("log_id, customer_id, similarity_score, recognized, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !logs || logs.length === 0) {
      return NextResponse.json({ detail: "No recognition events yet" }, { status: 404 });
    }

    const log = logs[0];

    let customerName: string | null = null;
    let customerId: string | null = null;
    let visitCount: number | null = null;
    let segment: string | null = null;
    let memberSince: string | null = null;
    let favorites: { menu_name: string; total_qty: number }[] = [];

    if (log.recognized && log.customer_id) {
      customerId = log.customer_id;

      // Fetch customer profile
      const { data: customers } = await supabase
        .from("customers")
        .select("name, created_at")
        .eq("customer_id", log.customer_id)
        .limit(1);

      if (customers && customers.length > 0) {
        customerName = customers[0].name;
        memberSince = customers[0].created_at;
      }

      // Visit count
      const { count } = await supabase
        .from("visits")
        .select("visit_id", { count: "exact", head: true })
        .eq("customer_id", log.customer_id);

      visitCount = count ?? 0;
      segment = getSegment(visitCount);

      // Top 3 favorite menu items
      const { data: favRows } = await supabase
        .from("orders")
        .select(`
          qty,
          visits!inner(customer_id),
          menu(name)
        `)
        .eq("visits.customer_id", log.customer_id);

      if (favRows) {
        const totals: Record<string, number> = {};
        for (const row of favRows as any[]) {
          const name = row.menu?.name;
          if (name) totals[name] = (totals[name] || 0) + row.qty;
        }
        favorites = Object.entries(totals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([menu_name, total_qty]) => ({ menu_name, total_qty }));
      }
    }

    return NextResponse.json({
      log_id: log.log_id,
      recognized: log.recognized,
      customer_id: customerId,
      customer_name: customerName ?? (log.recognized ? "" : "Unknown"),
      similarity_score: log.similarity_score,
      visit_count: visitCount,
      segment,
      member_since: memberSince,
      favorites,
      created_at: log.created_at,
    });
  } catch (e) {
    console.error("[/api/recognition/latest]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
