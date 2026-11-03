import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { customerContext } from "@/lib/server/customers";
import { getSettings, RECOGNITION_WINDOW_SEC } from "@/lib/server/settings";
import { closeStaleVisits } from "@/lib/server/visits";

export const dynamic = "force-dynamic";

/**
 * Everything the Kasir screen needs in ONE request (polled every 2 s):
 * who is at the cashier right now (latest decision of the UNO Q within the last
 * RECOGNITION_WINDOW_SEC), plus that customer's profile, open tab and recommendations.
 */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  closeStaleVisits().catch(() => undefined);
  const s = await getSettings();
  const since = new Date(Date.now() - RECOGNITION_WINDOW_SEC * 1000).toISOString();

  const { data: logs, error } = await db()
    .from("recognition_logs")
    .select("log_id, customer_id, similarity_score, recognized, is_correct, created_at")
    .eq("camera_id", s.devices.cashier_camera_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const log = logs?.[0];
  if (!log) return json({ state: "idle", window_sec: RECOGNITION_WINDOW_SEC });
  if (!log.recognized || !log.customer_id || log.is_correct === false) {
    return json({ state: "unknown", log, window_sec: RECOGNITION_WINDOW_SEC });
  }
  const customer = await customerContext(log.customer_id);
  if (!customer) return json({ state: "unknown", log, window_sec: RECOGNITION_WINDOW_SEC });
  return json({ state: "known", log, customer, window_sec: RECOGNITION_WINDOW_SEC });
});
