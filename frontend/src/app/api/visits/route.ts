import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // today | week | month
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const supabase = db();

    let query = supabase
      .from("visits")
      .select(`
        visit_id,
        customer_id,
        entry_time,
        exit_time,
        duration_minutes,
        customers(name)
      `)
      .order("entry_time", { ascending: false })
      .range(offset, offset + limit - 1);

    const now = new Date();
    if (filter === "today") {
      const today = now.toISOString().slice(0, 10);
      query = query.gte("entry_time", `${today}T00:00:00`).lte("entry_time", `${today}T23:59:59`);
    } else if (filter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      query = query.gte("entry_time", startOfWeek.toISOString());
    } else if (filter === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("entry_time", startOfMonth);
    }

    const { data, error } = await query;
    if (error) throw error;

    const result = (data ?? []).map((row: any) => ({
      visit_id: row.visit_id,
      customer_id: row.customer_id,
      customer_name: row.customers?.name ?? "Unknown",
      entry_time: row.entry_time,
      exit_time: row.exit_time,
      duration_minutes: row.duration_minutes,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/visits]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
