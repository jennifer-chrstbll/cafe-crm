import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { validateMenu } from "@/lib/server/menu";

export const PATCH = route(async (req: NextRequest, ctx) => {
  await requireUser(req, ["OWNER"]);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const patch = validateMenu(await body(req), true);
  const { error } = await db().from("menu").update({ ...patch, updated_at: new Date().toISOString() }).eq("menu_id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

/** Menu items are hidden, never hard-deleted: old orders keep pointing at them. */
export const DELETE = route(async (req: NextRequest, ctx) => {
  await requireUser(req, ["OWNER"]);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const { error } = await db().from("menu").update({ is_active: false }).eq("menu_id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
