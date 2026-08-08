import { NextRequest, NextResponse } from "next/server";
import { db, getSegment } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = db();

    const { data: customers } = await supabase
      .from("customers")
      .select("customer_id, name, created_at")
      .eq("customer_id", id)
      .limit(1);

    if (!customers || customers.length === 0) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }

    const customer = customers[0];

    const { count: visitCount } = await supabase
      .from("visits")
      .select("visit_id", { count: "exact", head: true })
      .eq("customer_id", id);

    const { count: recognitionCount } = await supabase
      .from("recognition_logs")
      .select("log_id", { count: "exact", head: true })
      .eq("customer_id", id);

    const { data: lastVisitRows } = await supabase
      .from("visits")
      .select("entry_time")
      .eq("customer_id", id)
      .order("entry_time", { ascending: false })
      .limit(1);

    const vc = visitCount ?? 0;

    return NextResponse.json({
      customer_id: customer.customer_id,
      name: customer.name,
      visit_count: vc,
      recognition_count: recognitionCount ?? 0,
      segment: getSegment(vc),
      last_visit: lastVisitRows?.[0]?.entry_time ?? null,
    });
  } catch (e) {
    console.error("[/api/customers/[id]/summary]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
