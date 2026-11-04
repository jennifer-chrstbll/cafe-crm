import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, isUuid, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const DEVICE_TIMEOUT_SEC = 25;    // PENDING: the UNO Q picks a request up within ~1 s when online
const CAPTURE_TIMEOUT_SEC = 50;   // RUNNING: capture takes <= 20 s on the device

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
  const age = Date.now() - new Date(data.created_at).getTime();
  if (data.status === "RUNNING" && age > CAPTURE_TIMEOUT_SEC * 1000) {
    const message = "Perekaman wajah terhenti. Coba lagi.";
    await db().from("enrollment_requests").update({ status: "FAILED", message, completed_at: new Date().toISOString() })
      .eq("request_id", id).eq("status", "RUNNING");
    return json({ ...data, status: "FAILED", message });
  }
  if (data.status === "PENDING" && age > DEVICE_TIMEOUT_SEC * 1000) {
    await db().from("enrollment_requests")
      .update({ status: "FAILED", message: "Kamera kasir tidak merespons. Pastikan perangkat menyala.",
                completed_at: new Date().toISOString() })
      .eq("request_id", id).eq("status", "PENDING");
    return json({ ...data, status: "FAILED", message: "Kamera kasir tidak merespons. Pastikan perangkat menyala." });
  }
  return json(data);
});
