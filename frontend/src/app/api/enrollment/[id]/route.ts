import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, isUuid, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const DEVICE_TIMEOUT_SEC = 25;

export const GET = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const { data } = await db()
    .from("enrollment_requests")
    .select("request_id, customer_id, status, message, n_frames, created_at, completed_at")
    .eq("request_id", id)
    .maybeSingle();
  if (!data) throw new ApiError(404, "Permintaan tidak ditemukan.");
  if (data.status === "PENDING" && Date.now() - new Date(data.created_at).getTime() > DEVICE_TIMEOUT_SEC * 1000) {
    await db().from("enrollment_requests")
      .update({ status: "FAILED", message: "Kamera kasir tidak merespons. Pastikan perangkat menyala.",
                completed_at: new Date().toISOString() })
      .eq("request_id", id).eq("status", "PENDING");
    return json({ ...data, status: "FAILED", message: "Kamera kasir tidak merespons. Pastikan perangkat menyala." });
  }
  return json(data);
});
