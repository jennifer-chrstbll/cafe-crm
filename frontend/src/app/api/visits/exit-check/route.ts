import { NextRequest } from "next/server";
import { requireUserOrDevice } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { closeStaleVisits } from "@/lib/server/visits";

/** Close visits whose person has left (also runs automatically while the app is in use). */
export const POST = route(async (req: NextRequest) => {
  await requireUserOrDevice(req);
  return json({ closed: await closeStaleVisits(true) });
});
