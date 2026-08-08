import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/pos/order — create order (with optional pay_now)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, items, visit_id, pay_now = false, payment_method } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json({ detail: "customer_id dan items wajib diisi" }, { status: 422 });
    }
    if (pay_now && !payment_method) {
      return NextResponse.json({ detail: "payment_method wajib diisi kalau pay_now=true" }, { status: 422 });
    }

    const supabase = db();

    // Validate customer
    const { data: customers } = await supabase
      .from("customers")
      .select("customer_id, name")
      .eq("customer_id", customer_id)
      .eq("is_active", true)
      .limit(1);

    if (!customers || customers.length === 0) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }
    const customer = customers[0];

    // Get or create open visit
    let activeVisitId: string;
    if (visit_id) {
      const { data: v } = await supabase
        .from("visits")
        .select("visit_id, exit_time")
        .eq("visit_id", visit_id)
        .eq("customer_id", customer_id)
        .limit(1);
      if (!v || v.length === 0) return NextResponse.json({ detail: "Visit not found" }, { status: 404 });
      if (v[0].exit_time) return NextResponse.json({ detail: "Visit sudah selesai" }, { status: 400 });
      activeVisitId = visit_id;
    } else {
      // Find open visit
      const { data: openVisits } = await supabase
        .from("visits")
        .select("visit_id")
        .eq("customer_id", customer_id)
        .is("exit_time", null)
        .order("entry_time", { ascending: false })
        .limit(1);

      if (openVisits && openVisits.length > 0) {
        activeVisitId = openVisits[0].visit_id;
      } else {
        // Create new visit
        const { data: newVisit, error: visitErr } = await supabase
          .from("visits")
          .insert({ customer_id, entry_time: new Date().toISOString() })
          .select("visit_id")
          .single();
        if (visitErr) throw visitErr;
        activeVisitId = newVisit.visit_id;
      }
    }

    // Resolve menu items and compute totals
    const menuIds = items.map((i: any) => i.menu_id);
    const { data: menus, error: menuErr } = await supabase
      .from("menu")
      .select("menu_id, name, price")
      .in("menu_id", menuIds)
      .eq("is_active", true);

    if (menuErr) throw menuErr;

    const menuMap: Record<string, any> = {};
    for (const m of menus ?? []) menuMap[m.menu_id] = m;

    let total = 0;
    const orderRows: any[] = [];
    const itemsResp: any[] = [];

    for (const item of items) {
      const menu = menuMap[item.menu_id];
      if (!menu) return NextResponse.json({ detail: `Menu ${item.menu_id} not found` }, { status: 404 });

      const subtotal = parseFloat(menu.price) * item.qty;
      total += subtotal;
      orderRows.push({ visit_id: activeVisitId, menu_id: item.menu_id, qty: item.qty, subtotal });
      itemsResp.push({ menu_id: item.menu_id, menu_name: menu.name, qty: item.qty, price: menu.price, subtotal });
    }

    // Insert orders
    const { data: insertedOrders, error: orderErr } = await supabase
      .from("orders")
      .insert(orderRows)
      .select("order_id, menu_id, qty, subtotal");

    if (orderErr) throw orderErr;

    // Map order_ids back
    const itemsWithIds = itemsResp.map((item, i) => ({
      ...item,
      order_id: insertedOrders?.[i]?.order_id,
    }));

    return NextResponse.json({
      visit_id: activeVisitId,
      customer_name: customer.name,
      status: "PAID",
      total,
      items: itemsWithIds,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  } catch (e) {
    console.error("[/api/pos/order POST]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
