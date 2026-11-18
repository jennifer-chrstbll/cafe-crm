import { db } from "../db";
import { ApiError } from "./http";
import { getSettings } from "./settings";

/** Devices send a heartbeat every 10 s; three missed heartbeats = offline. */
export const OFFLINE_AFTER_SEC = 45;

/** A device ignores commands older than 2 minutes (no surprise restarts after a power cut). */
export type CommandName = "self_check" | "restart" | "reload_gallery" | "assign" | "unassign" | "unstaff";

export const OWNER_COMMANDS: CommandName[] = ["self_check", "restart", "reload_gallery"];
export const STAFF_COMMANDS: CommandName[] = ["assign", "unassign", "unstaff"];

export interface DeviceRow {
  device_id: string;
  kind: string;
  last_seen_at: string;
  info: Record<string, unknown>;
}

export const isOnline = (d: { last_seen_at: string }) =>
  (Date.now() - new Date(d.last_seen_at).getTime()) / 1000 < OFFLINE_AFTER_SEC;

export async function listDevices(): Promise<DeviceRow[]> {
  const { data, error } = await db().from("device_status").select("device_id, kind, last_seen_at, info").order("kind");
  if (error) throw new Error(error.message);
  return (data ?? []) as DeviceRow[];
}

export async function getDevice(deviceId: string): Promise<DeviceRow | null> {
  const { data } = await db().from("device_status").select("device_id, kind, last_seen_at, info")
    .eq("device_id", deviceId).maybeSingle();
  return (data as DeviceRow | null) ?? null;
}

export async function queueCommand(deviceId: string, command: CommandName, payload: Record<string, unknown> = {},
                                   createdBy?: string): Promise<string> {
  const { data, error } = await db().from("device_commands")
    .insert({ device_id: deviceId, command, payload, created_by: createdBy ?? null })
    .select("command_id").single();
  if (error) throw new Error(error.message);
  return data.command_id as string;
}

/** After face data changed: ask the UNO Q to reload now (it also reloads every 2 minutes). */
export async function requestGalleryReload(): Promise<void> {
  try {
    const s = await getSettings();
    await queueCommand(s.devices.cashier_camera_id, "reload_gallery");
  } catch {
    // migration 005 missing or device unknown: the periodic reload still happens
  }
}

const KEY_RE = /^[A-Za-z0-9_.-]{1,40}\/[A-Za-z0-9_.-]{1,20}$/;

/** "<device_id>/<camera>" e.g. "pi-001/CAM_1", "uno-q-001/face". */
export function parseCameraKey(key: unknown): { device_id: string; camera: string } {
  if (typeof key !== "string" || !KEY_RE.test(key)) throw new ApiError(400, "Kamera tidak valid.");
  const [device_id, camera] = key.split("/");
  return { device_id, camera };
}

export interface TrackingPrompt {
  device_id: string;
  camera_id: string;
  customer_id: string;
  name: string;
  reason: string;
}

/** Questions the Raspberry Pi could not answer alone ("which person is this customer?"). */
export async function trackingPrompts(): Promise<TrackingPrompt[]> {
  try {
    const devices = await listDevices();
    return devices.filter((d) => d.kind === "persontrack" && isOnline(d)).flatMap((d) =>
      ((d.info.prompts ?? []) as { customer_id: string; name?: string; reason?: string; camera_id?: string }[])
        .filter((p) => typeof p.customer_id === "string")
        .map((p) => ({ device_id: d.device_id, camera_id: p.camera_id ?? "CAM_1", customer_id: p.customer_id,
                       name: p.name ?? "", reason: p.reason ?? "" })));
  } catch {
    return [];
  }
}

export interface CameraEntry {
  key: string;
  device_id: string;
  camera: string;
  kind: "face" | "area";
  label: string;
  online: boolean;
  ok: boolean;
  floor: number | null;
  resolution: [number, number] | null;
}

/** Every camera the devices report, for the camera pickers. */
/** Names the owner gave the cameras (app_settings.camera_names): { device_id: { role: name } }. */
export type CameraNames = Record<string, Record<string, string>>;

export function camerasOf(devices: DeviceRow[], names: CameraNames = {}): CameraEntry[] {
  const out: CameraEntry[] = [];
  for (const d of devices) {
    const online = isOnline(d);
    if (d.kind === "facerec") {
      const cam = (d.info.camera ?? {}) as { ok?: boolean; width?: number; height?: number };
      out.push({ key: `${d.device_id}/face`, device_id: d.device_id, camera: "face", kind: "face",
        label: "Kamera wajah (kasir)", online, ok: !!cam.ok, floor: null,
        resolution: cam.width && cam.height ? [cam.width, cam.height] : null });
    } else if (d.kind === "persontrack") {
      const cams = (d.info.cameras ?? []) as { id: string; floor?: number; ok?: boolean; resolution?: [number, number] }[];
      for (const c of cams) {
        const n = c.id.replace("CAM_", "");
        const own = names[d.device_id]?.[c.id];
        const floors = new Set(cams.map((x) => x.floor ?? 1)).size > 1;
        out.push({ key: `${d.device_id}/${c.id}`, device_id: d.device_id, camera: c.id, kind: "area",
          label: (own || `Kamera area ${n}`) + (floors && c.floor ? ` · lantai ${c.floor}` : ""), online,
          ok: !!c.ok, floor: c.floor ?? null, resolution: c.resolution ?? null });
      }
    }
  }
  return out;
}
