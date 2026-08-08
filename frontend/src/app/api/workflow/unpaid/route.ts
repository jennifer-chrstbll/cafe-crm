import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/workflow/unpaid — lists all active unpaid stay-in orders
export async function GET(_req: NextRequest) {
  try {
    const supabase = db();

    // Query unpaid transactions joined with visits and customers
    const { data: txs, error: txErr } = await supabase
      .from("transactions")
      .select(`
        transaction_id,
        visit_id,
        status,
        total_amount,
        payment_method,
        created_at,
        visits!inner (
          customer_id,
          customers (name)
        )
      `)
      .eq("status", "UNPAID")
      .order("created_at", { ascending: false });

    if (txErr) {
      console.error("[/api/workflow/unpaid]", txErr);
      return NextResponse.json([]);
    }

    const visitIds = (txs ?? []).map((t: any) => t.visit_id);

    // Fetch order items for these visits
    const { data: orders } = await supabase
      .from("orders")
      .select(`
        visit_id,
        qty,
        subtotal,
        menu (name)
      `)
      .in("visit_id", visitIds);

    const orderMap: Record<string, any[]> = {};
    for (const o of orders ?? []) {
      if (!orderMap[o.visit_id]) orderMap[o.visit_id] = [];
      orderMap[o.visit_id].push({
        menu_name: (o as any).menu?.name ?? "Menu Item",
        qty: o.qty,
        subtotal: parseFloat(o.subtotal),
      });
    }

    const result = (txs ?? []).map((t: any) => ({
      transaction_id: t.transaction_id,
      visit_id: t.visit_id,
      customer_id: t.visits?.customer_id ?? null,
      customer_name: t.visits?.customers?.name ?? "Customer Stay-in",
      total_amount: parseFloat(t.total_amount ?? 0),
      items: orderMap[t.visit_id] ?? [],
      created_at: t.created_at,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/workflow/unpaid]", e);
    return NextResponse.json([]);
  }
}
