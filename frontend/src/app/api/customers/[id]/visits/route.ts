import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = db();

    const { data: visits, error } = await supabase
      .from("visits")
      .select("visit_id, customer_id, entry_time, exit_time, duration_minutes")
      .eq("customer_id", id)
      .order("entry_time", { ascending: false });

    if (error) throw error;

    return NextResponse.json(visits ?? []);
  } catch (e) {
    console.error("[/api/customers/[id]/visits]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
