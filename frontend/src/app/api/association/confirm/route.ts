import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { bindTrack } from "@/lib/server/association";

/** Cashier picks the right person when the automatic association was ambiguous. */
export const POST = route(async (req: NextRequest) => {
  await requireUser(req);
  const b = await body<{ customer_id?: string; track_id?: string; score?: number }>(req);
  if (!isUuid(b.customer_id) || !b.track_id) throw new ApiError(422, "customer_id dan track_id wajib diisi.");
  const visitId = await bindTrack(b.customer_id, b.track_id, typeof b.score === "number" ? b.score : null, "MANUAL");
  return json({ status: "MATCHED", visit_id: visitId, track_id: b.track_id, mode: "MANUAL" });
});
