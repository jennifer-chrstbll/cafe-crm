import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { getStreamConfig } from "@/lib/server/stream";

export const dynamic = "force-dynamic";

/** Realtime channel for live camera pictures (see lib/server/stream.ts). null = not configured. */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  return json(await getStreamConfig());
});
