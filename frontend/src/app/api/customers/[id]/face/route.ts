import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, isUuid, json, route } from "@/lib/server/http";
import { requestGalleryReload } from "@/lib/server/devices";

/** Withdraw consent: delete the customer's face embeddings (the profile stays). Any staff can do it on request. */
export const DELETE = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const sb = db();
  const { error } = await sb.from("embeddings").delete().eq("customer_id", id);
  if (error) throw new Error(error.message);
  await sb.from("customers").update({ consent_given: false, consent_given_at: null }).eq("customer_id", id);
  await requestGalleryReload();
  return json({ ok: true });
});
