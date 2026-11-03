import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";

/** Cashier feedback on a recognition: is_correct = true ("Benar") / false ("Bukan dia"). */
export const PATCH = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const { is_correct } = await body<{ is_correct?: boolean | null }>(req);
  if (typeof is_correct !== "boolean" && is_correct !== null) throw new ApiError(422, "is_correct harus true/false.");
  const { error } = await db().from("recognition_logs").update({ is_correct }).eq("log_id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
