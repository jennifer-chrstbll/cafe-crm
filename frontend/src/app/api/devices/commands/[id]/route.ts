import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, isUuid, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const TIMEOUT_SEC = 30;

export const GET = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const { data, error } = await db().from("device_commands")
    .select("command_id, device_id, command, status, message, result, created_at, finished_at")
    .eq("command_id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError(404, "Perintah tidak ditemukan.");
  if ((data.status === "PENDING" || data.status === "RUNNING")
      && Date.now() - new Date(data.created_at).getTime() > TIMEOUT_SEC * 1000) {
    const message = "Perangkat tidak menjawab. Pastikan perangkat menyala dan terhubung ke Wi-Fi.";
    await db().from("device_commands").update({ status: "FAILED", message, finished_at: new Date().toISOString() })
      .eq("command_id", id).in("status", ["PENDING", "RUNNING"]);
    return json({ ...data, status: "FAILED", message });
  }
  return json(data);
});
