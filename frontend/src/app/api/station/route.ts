import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { customerContextCached } from "@/lib/server/customers";
import { getSettings, RECOGNITION_WINDOW_SEC } from "@/lib/server/settings";
import { closeStaleVisits } from "@/lib/server/visits";
import { trackingPrompts } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/**
 * Everything the Kasir screen needs in ONE request (polled every 2 s):
 * who is at the cashier right now (latest decision of the UNO Q within the last
 * RECOGNITION_WINDOW_SEC), plus that customer's profile, open tab and recommendations,
 * plus the person-tracking questions waiting for the cashier (tracking_prompts).
 */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const q = req.nextUrl.searchParams;
  // Kamera page only needs the person-tracking questions.
  if (q.get("prompts")) return json({ state: "idle", window_sec: RECOGNITION_WINDOW_SEC, tracking_prompts: await trackingPrompts() });
  const fresh = q.get("fresh") === "1";
  closeStaleVisits().catch(() => undefined);
  const s = await getSettings();
  const prompts = trackingPrompts();
  const since = new Date(Date.now() - RECOGNITION_WINDOW_SEC * 1000).toISOString();

  const { data: logs, error } = await db()
    .from("recognition_logs")
    .select("log_id, customer_id, similarity_score, recognized, is_correct, created_at")
    .eq("camera_id", s.devices.cashier_camera_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const base = { window_sec: RECOGNITION_WINDOW_SEC, tracking_prompts: await prompts };
  const log = logs?.[0];
  if (!log) return json({ state: "idle", ...base });
  if (!log.recognized || !log.customer_id || log.is_correct === false) {
    return json({ state: "unknown", log, ...base });
  }
  const customer = await customerContextCached(log.customer_id, fresh);
  if (!customer) return json({ state: "unknown", log, ...base });
  return json({ state: "known", log, customer, ...base });
});
