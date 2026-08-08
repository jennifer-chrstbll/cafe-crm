import { NextRequest, NextResponse } from "next/server";
import { db, getSegment } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/customers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = db();

    const { data: customers, error } = await supabase
      .from("customers")
      .select("customer_id, name, phone_number, email, gender, date_of_birth, notes, is_active, created_at")
      .eq("customer_id", id)
      .limit(1);

    if (error || !customers || customers.length === 0) {
      return NextResponse.json({ detail: "Customer not found" }, { status: 404 });
    }

    const customer = customers[0];

    const { count: visitCount } = await supabase
      .from("visits")
      .select("visit_id", { count: "exact", head: true })
      .eq("customer_id", id);

    const vc = visitCount ?? 0;

    return NextResponse.json({
      ...customer,
      visit_count: vc,
      segment: getSegment(vc),
    });
  } catch (e) {
    console.error("[/api/customers/[id] GET]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/customers/[id] — update customer
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await db()
      .from("customers")
      .update(body)
      .eq("customer_id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (e) {
    console.error("[/api/customers/[id] PATCH]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
