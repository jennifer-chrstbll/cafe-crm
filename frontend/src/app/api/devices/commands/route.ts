import { NextRequest } from "next/server";
import { db, GUEST_ID } from "@/lib/db";
import { isOwnerLevel, requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { CommandName, getDevice, isOnline, OWNER_COMMANDS, queueCommand, STAFF_COMMANDS } from "@/lib/server/devices";

export const dynamic = "force-dynamic";

/**
 * Send a command to a device; the page then polls GET /api/devices/commands/[id].
 *   owner : self_check | restart | reload_gallery
 *   staff : assign {track_id, customer_id} | unassign {track_id} | unstaff {track_id}   (Kamera page)
 */
export const POST = route(async (req: NextRequest) => {
  const s = await requireUser(req);
  const b = await body<{ device_id?: string; command?: string; payload?: Record<string, unknown> }>(req);
  const command = b.command as CommandName;
  if (!OWNER_COMMANDS.includes(command) && !STAFF_COMMANDS.includes(command)) throw new ApiError(400, "Perintah tidak dikenal.");
  if (OWNER_COMMANDS.includes(command) && !isOwnerLevel(s.role)) throw new ApiError(403, "Hanya pemilik kafe.");
  if (typeof b.device_id !== "string") throw new ApiError(400, "Perangkat tidak valid.");
  const dev = await getDevice(b.device_id);
  if (!dev) throw new ApiError(404, "Perangkat belum pernah terhubung.");
  if (!isOnline(dev)) throw new ApiError(409, "Perangkat sedang offline. Periksa daya dan Wi-Fi-nya.");

  let payload: Record<string, unknown> = {};
  if (command === "assign" || command === "unassign" || command === "unstaff") {
    if (dev.kind !== "persontrack") throw new ApiError(400, "Identitas manual hanya untuk kamera area.");
    const track = b.payload?.track_id;
    if (typeof track !== "string" || track.length > 60) throw new ApiError(400, "Orang yang dipilih tidak valid.");
    payload = { track_id: track };
    if (command === "unassign" && isUuid(b.payload?.customer_id)) payload.customer_id = b.payload!.customer_id;
    if (command === "assign") {
      const cid = b.payload?.customer_id;
      if (!isUuid(cid) || cid === GUEST_ID) throw new ApiError(400, "Pilih pelanggan yang terdaftar.");
      const { data: c } = await db().from("customers").select("name, is_active").eq("customer_id", cid).maybeSingle();
      if (!c || !c.is_active) throw new ApiError(404, "Pelanggan tidak ditemukan.");
      payload = { track_id: track, customer_id: cid, name: c.name };
    }
  }
  const id = await queueCommand(dev.device_id, command, payload, s.sub);
  return json({ command_id: id }, 201);
});
