import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/workflow/unpaid — lists all active unpaid stay-in orders
export async function GET(_req: NextRequest) {
  try {
    const supabase = db();

    // 1. Fetch all UNPAID transactions
    const { data: txs, error: txErr } = await supabase
      .from("transactions")
      .select("transaction_id, visit_id, status, total_amount, payment_method, created_at")
      .eq("status", "UNPAID")
      .order("created_at", { ascending: false });

    if (txErr || !txs || txs.length === 0) {
      return NextResponse.json([]);
    }

    const visitIds = txs.map((t: any) => t.visit_id);

    // 2. Fetch visits and customers
    const { data: visits } = await supabase
      .from("visits")
      .select("visit_id, customer_id, customers(name)")
      .in("visit_id", visitIds);

    const visitMap: Record<string, any> = {};
    for (const v of visits ?? []) {
      visitMap[v.visit_id] = v;
    }

    // 3. Fetch order items
    const { data: orders } = await supabase
      .from("orders")
      .select("visit_id, qty, subtotal, menu(name)")
      .in("visit_id", visitIds);

    const orderMap: Record<string, any[]> = {};
    for (const o of orders ?? []) {
      if (!orderMap[o.visit_id]) orderMap[o.visit_id] = [];
      orderMap[o.visit_id].push({
        menu_name: (o as any).menu?.name ?? "Item",
        qty: o.qty,
        subtotal: parseFloat(o.subtotal),
      });
    }

    const result = txs.map((t: any) => {
      const v = visitMap[t.visit_id];
      const items = orderMap[t.visit_id] ?? [];
      const calcTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

      return {
        transaction_id: t.transaction_id,
        visit_id: t.visit_id,
        customer_id: v?.customer_id ?? null,
        customer_name: v?.customers?.name ?? "Customer Stay-in",
        total_amount: calcTotal || parseFloat(t.total_amount ?? 0),
        items,
        created_at: t.created_at,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/workflow/unpaid]", e);
    return NextResponse.json([]);
  }
}
