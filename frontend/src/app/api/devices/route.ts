import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/server/http";
import { DeviceRow, isOnline, listDevices } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/** Heartbeats of the UNO Q (face recognition) and Raspberry Pi (person tracking). */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  let devices: DeviceRow[] = [];
  try {
    devices = await listDevices();
  } catch {
    devices = [];          // migration 004 not applied yet: the banner explains it
  }
  return json(devices.map((d) => ({
    ...d,
    online: isOnline(d),
    seconds_ago: Math.round((Date.now() - new Date(d.last_seen_at).getTime()) / 1000),
  })));
});
