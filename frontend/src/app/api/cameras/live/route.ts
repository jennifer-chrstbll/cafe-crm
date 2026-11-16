import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/server/http";
import { getDevice, isOnline, parseCameraKey } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/**
 * Address of the real-time camera view (?key=pi-001/CAM_1): a WebSocket straight to the device
 * (livecast.py on the device, published through a Cloudflare tunnel). The picture never passes
 * through this website or Supabase. The token changes every time the device program starts and is
 * given to logged-in users only. url = null: not available (the page uses the slower view).
 */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const { device_id, camera } = parseCameraKey(req.nextUrl.searchParams.get("key"));
  const dev = await getDevice(device_id);
  const live = (dev?.info?.live ?? null) as { url?: string | null; token?: string | null; state?: string; fps_max?: number } | null;
  const ok = !!(dev && isOnline(dev) && live?.url && live.token);
  const url = ok
    ? `${live!.url!.replace(/^http/, "ws").replace(/\/$/, "")}/live?cam=${encodeURIComponent(camera)}&token=${encodeURIComponent(live!.token!)}`
    : null;
  return NextResponse.json({ url, state: live?.state ?? null, fps_max: live?.fps_max ?? null },
    { headers: { "Cache-Control": "no-store" } });
});
