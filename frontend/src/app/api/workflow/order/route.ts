import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, order_type = "pay_now", payment_method = "QRIS", items } = body;

    if (!customer_id || !items || items.length === 0) {
      return NextResponse.json({ detail: "customer_id dan items wajib diisi" }, { status: 422 });
    }

    const supabase = db();

    // 1. Check customer exists
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("customer_id, name")
      .eq("customer_id", customer_id)
      .eq("is_active", true)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 2. Get or create open visit
    let activeVisitId: string;
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
      const { data: newVisit, error: visitErr } = await supabase
        .from("visits")
        .insert({ customer_id, entry_time: now })
        .select("visit_id")
        .single();

      if (visitErr || !newVisit) {
        console.error("[/api/workflow/order] Visit creation error:", visitErr);
        return NextResponse.json({ detail: "Gagal membuat kunjungan" }, { status: 500 });
      }
      activeVisitId = newVisit.visit_id;
    }

    // 3. Fetch menu prices
    const menuIds = items.map((i: any) => i.menu_id);
    const { data: menus, error: menuErr } = await supabase
      .from("menu")
      .select("menu_id, name, price")
      .in("menu_id", menuIds);

    if (menuErr || !menus) {
      return NextResponse.json({ detail: "Gagal mengambil data menu" }, { status: 500 });
    }

    const menuMap: Record<string, any> = {};
    for (const m of menus) menuMap[m.menu_id] = m;

    let totalAmount = 0;
    const isPaid = order_type === "pay_now";

    // 4. Create Transaction if pay_now
    let transactionId: string | null = null;
    if (isPaid) {
      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          visit_id: activeVisitId,
          status: "PAID",
          total_amount: 0,
          payment_method: payment_method,
          paid_at: now,
          created_at: now,
        })
        .select("transaction_id")
        .single();

      if (!txErr && tx) {
        transactionId = tx.transaction_id;
      }
    }

    // 5. Insert Order Items
    const orderRows: any[] = [];
    for (const item of items) {
      const menu = menuMap[item.menu_id];
      if (!menu) continue;
      const qty = item.quantity || item.qty || 1;
      const subtotal = parseFloat(menu.price) * qty;
      totalAmount += subtotal;

      orderRows.push({
        visit_id: activeVisitId,
        menu_id: item.menu_id,
        transaction_id: transactionId,
        qty: qty,
        subtotal: subtotal,
        created_at: now,
      });
    }

    const { data: insertedOrders, error: orderErr } = await supabase
      .from("orders")
      .insert(orderRows)
      .select("order_id");

    if (orderErr) {
      console.error("[/api/workflow/order] Order insert error:", orderErr);
      return NextResponse.json({ detail: "Gagal menyimpan pesanan" }, { status: 500 });
    }

    // Update transaction total if created
    if (transactionId) {
      await supabase
        .from("transactions")
        .update({ total_amount: totalAmount })
        .eq("transaction_id", transactionId);
    }

    return NextResponse.json({
      status: "SUCCESS",
      order_id: insertedOrders?.[0]?.order_id || "",
      order_type: order_type,
      order_status: isPaid ? "PAID" : "UNPAID",
      transaction_id: transactionId,
      visit_id: activeVisitId,
      total_amount: totalAmount,
      items_count: items.length,
    });
  } catch (e: any) {
    console.error("[/api/workflow/order]", e);
    return NextResponse.json({ detail: e.message || "Internal server error" }, { status: 500 });
  }
}
