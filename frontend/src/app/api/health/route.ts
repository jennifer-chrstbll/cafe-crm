import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Is the database reachable and are migrations 004 + 005 applied? Shown as a banner to the owner. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const sb = db();
  const checks = await Promise.all([
    sb.from("orders").select("transaction_id").limit(1),
    sb.from("app_settings").select("key").limit(1),
    sb.from("enrollment_requests").select("request_id").limit(1),
    sb.from("device_status").select("device_id").limit(1),
    sb.from("camera_tracks").select("customer_id, global_id").limit(1),
  ]);
  const checks005 = await Promise.all([
    sb.from("device_commands").select("command_id").limit(1),
    sb.from("device_frames").select("camera_key").limit(1),
    sb.from("visits").select("exit_reason").limit(1),
  ]);
  const failed = checks.map((c) => c.error?.message).filter(Boolean);
  const failed005 = checks005.map((c) => c.error?.message).filter(Boolean);
  return json({ database: true, migration_004: failed.length === 0, migration_005: failed005.length === 0,
                problems: [...failed, ...failed005] });
});
