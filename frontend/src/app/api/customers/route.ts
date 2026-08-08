import { NextRequest, NextResponse } from "next/server";
import { db, getSegment } from "@/lib/db";

// GET /api/customers — list all active customers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const supabase = db();

    let query = supabase
      .from("customers")
      .select("customer_id, name, phone_number, email, gender, date_of_birth, notes, is_active, created_at")
      .eq("is_active", true)
      .order("name");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: customers, error } = await query;
    if (error) throw error;

    // Get visit counts for all customers
    const customerIds = (customers ?? []).map((c: any) => c.customer_id);

    const { data: visitCounts } = await supabase
      .from("visits")
      .select("customer_id")
      .in("customer_id", customerIds);

    const countMap: Record<string, number> = {};
    for (const v of visitCounts ?? []) {
      countMap[v.customer_id] = (countMap[v.customer_id] || 0) + 1;
    }

    // Get last visit for each customer
    const { data: lastVisits } = await supabase
      .from("visits")
      .select("customer_id, entry_time")
      .in("customer_id", customerIds)
      .order("entry_time", { ascending: false });

    const lastVisitMap: Record<string, string> = {};
    for (const v of lastVisits ?? []) {
      if (!lastVisitMap[v.customer_id]) {
        lastVisitMap[v.customer_id] = v.entry_time;
      }
    }

    const result = (customers ?? []).map((c: any) => {
      const vc = countMap[c.customer_id] ?? 0;
      return {
        ...c,
        visit_count: vc,
        last_visit: lastVisitMap[c.customer_id] ?? null,
        segment: getSegment(vc),
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/customers GET]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

// POST /api/customers — create new customer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone_number, email, gender, date_of_birth, notes } = body;

    if (!name) {
      return NextResponse.json({ detail: "Nama wajib diisi" }, { status: 422 });
    }

    const { data, error } = await db()
      .from("customers")
      .insert({ name, phone_number, email, gender, date_of_birth, notes, is_active: true })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ...data, visit_count: 0, last_visit: null, segment: "New" }, { status: 201 });
  } catch (e) {
    console.error("[/api/customers POST]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
