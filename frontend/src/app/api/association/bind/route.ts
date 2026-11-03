import { NextRequest } from "next/server";
import { requireUserOrDevice } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { associate } from "@/lib/server/association";

/**
 * Called by the UNO Q (header x-device-key) right after it confirms a customer at the
 * cashier: binds that Customer ID to the person-tracking Track ID standing at the counter.
 * Body: { customer_id, face_timestamp? (ISO) }
 */
export const POST = route(async (req: NextRequest) => {
  await requireUserOrDevice(req);
  const b = await body<{ customer_id?: string; face_timestamp?: string }>(req);
  if (!isUuid(b.customer_id)) throw new ApiError(422, "customer_id wajib berupa UUID.");
  const t = b.face_timestamp ? new Date(b.face_timestamp) : new Date();
  if (Number.isNaN(t.getTime())) throw new ApiError(422, "face_timestamp tidak valid.");
  return json(await associate(b.customer_id, t));
});
