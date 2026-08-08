import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/workflow/checkout-unpaid — pays an unpaid stay-in order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, transaction_id, payment_method = "QRIS" } = body;

    const supabase = db();
    const now = new Date().toISOString();

    let txQuery = supabase.from("transactions").select("transaction_id, visit_id, total_amount").eq("status", "UNPAID");

    if (transaction_id) {
      txQuery = txQuery.eq("transaction_id", transaction_id);
    } else if (customer_id) {
      // Find open visit for this customer
      const { data: visits } = await supabase
        .from("visits")
        .select("visit_id")
        .eq("customer_id", customer_id)
        .order("entry_time", { ascending: false });

      if (!visits || visits.length === 0) {
        return NextResponse.json({ detail: "Tidak ada kunjungan aktif untuk customer ini" }, { status: 404 });
      }

      const visitIds = visits.map((v: any) => v.visit_id);
      txQuery = txQuery.in("visit_id", visitIds);
    } else {
      return NextResponse.json({ detail: "customer_id atau transaction_id wajib diisi" }, { status: 422 });
    }

    const { data: txs, error: fetchErr } = await txQuery.limit(1);

    if (fetchErr || !txs || txs.length === 0) {
      return NextResponse.json({ detail: "Tidak ada order UNPAID untuk dibayar" }, { status: 404 });
    }

    const tx = txs[0];

    // Compute total from orders if total_amount is 0
    let finalTotal = parseFloat(tx.total_amount ?? 0);
    if (finalTotal === 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("subtotal")
        .eq("visit_id", tx.visit_id);

      finalTotal = (orders ?? []).reduce((sum: number, o: any) => sum + parseFloat(o.subtotal ?? 0), 0);
    }

    // Update transaction to PAID
    const { error: updateErr } = await supabase
      .from("transactions")
      .update({
        status: "PAID",
        payment_method: payment_method,
        total_amount: finalTotal,
        paid_at: now,
      })
      .eq("transaction_id", tx.transaction_id);

    if (updateErr) {
      console.error("[/api/workflow/checkout-unpaid]", updateErr);
      return NextResponse.json({ detail: "Gagal memproses pelunasan" }, { status: 500 });
    }

    return NextResponse.json({
      status: "SUCCESS",
      transaction_id: tx.transaction_id,
      visit_id: tx.visit_id,
      payment_method: payment_method,
      total_amount: finalTotal,
      paid_at: now,
    });
  } catch (e: any) {
    console.error("[/api/workflow/checkout-unpaid]", e);
    return NextResponse.json({ detail: e.message || "Internal server error" }, { status: 500 });
  }
}
