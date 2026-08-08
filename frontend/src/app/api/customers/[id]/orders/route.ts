import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/customers/[id]/orders
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = db();

    // Get visits for this customer
    const { data: visits, error: visitErr } = await supabase
      .from("visits")
      .select("visit_id, entry_time")
      .eq("customer_id", id)
      .order("entry_time", { ascending: false })
      .limit(20);

    if (visitErr) throw visitErr;
    if (!visits || visits.length === 0) return NextResponse.json([]);

    const visitIds = visits.map((v: any) => v.visit_id);

    // Get orders for those visits
    const { data: orders, error: orderErr } = await supabase
      .from("orders")
      .select("visit_id, qty, subtotal, menu(name)")
      .in("visit_id", visitIds);

    if (orderErr) throw orderErr;

    // Group orders by visit
    const visitMap: Record<string, any> = {};
    for (const v of visits) {
      visitMap[v.visit_id] = { visit_id: v.visit_id, entry_time: v.entry_time, items: [], total: 0 };
    }

    for (const o of orders ?? []) {
      const group = visitMap[o.visit_id];
      if (!group) continue;
      group.items.push({
        menu_name: (o as any).menu?.name ?? "Unknown",
        qty: o.qty,
        subtotal: o.subtotal,
      });
      group.total += parseFloat(o.subtotal);
    }

    const result = Object.values(visitMap).filter((v: any) => v.items.length > 0);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/customers/[id]/orders]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
