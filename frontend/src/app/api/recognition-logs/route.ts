import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const recognizedParam = searchParams.get("recognized");

    const supabase = db();

    let query = supabase
      .from("recognition_logs")
      .select(`
        log_id,
        customer_id,
        similarity_score,
        recognized,
        camera_id,
        model_used,
        created_at,
        customers(name)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (recognizedParam !== null) {
      query = query.eq("recognized", recognizedParam === "true");
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = (data ?? []).map((row: any) => ({
      log_id: row.log_id,
      customer_id: row.customer_id ?? null,
      customer_name: row.customers?.name ?? null,
      similarity_score: row.similarity_score,
      recognized: row.recognized,
      camera_id: row.camera_id,
      model_used: row.model_used,
      created_at: row.created_at,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/recognition-logs]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
