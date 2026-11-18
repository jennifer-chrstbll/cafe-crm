import { ApiError } from "./http";

/**
 * Camera layout drawn by the owner on the live picture (Tata letak kamera).
 * All coordinates are fractions of the image (0..1), so they stay valid if the
 * camera resolution changes. The Raspberry Pi converts them to pixels.
 *
 *   cashier     the floor spot where the paying customer stands, r = radius as a fraction of the width
 *   facecam     the floor spot under the UNO Q face camera (on the counter). With it the Pi knows which
 *               body is in front of the face camera when two people stand at the cashier.
 *   staff       areas only staff stand in (behind the counter): people there never get a customer's identity
 *   exit        the door: a person last seen here has left (visit closed as EXIT_ZONE)
 *   transition  where people walk from this camera into the other one (ReID hands the identity over)
 */
export interface Rect { x1: number; y1: number; x2: number; y2: number }
export interface CameraLayout {
  cashier?: { x: number; y: number; r: number } | null;
  facecam?: { x: number; y: number } | null;
  staff?: Rect[];
  exit?: Rect[];
  transition?: Rect[];
  updated_at?: string;
}
export type LayoutMap = Record<string, CameraLayout>;

export interface CameraSource { source: string; floor?: number; enabled?: boolean }
export type SourcesMap = Record<string, Record<string, CameraSource>>;

const CAM_ID = /^[A-Za-z0-9_.-]{1,20}$/;
const DEVICE_ID = /^[A-Za-z0-9_.-]{1,40}$/;
const frac = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

function rects(v: unknown, what: string): Rect[] {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > 10) throw new ApiError(422, `${what}: paling banyak 10 area.`);
  return v.map((r) => {
    const o = r as Record<string, unknown>;
    if (!frac(o.x1) || !frac(o.y1) || !frac(o.x2) || !frac(o.y2)) throw new ApiError(422, `${what}: koordinat tidak valid.`);
    const x1 = Math.min(o.x1 as number, o.x2 as number), x2 = Math.max(o.x1 as number, o.x2 as number);
    const y1 = Math.min(o.y1 as number, o.y2 as number), y2 = Math.max(o.y1 as number, o.y2 as number);
    if (x2 - x1 < 0.01 || y2 - y1 < 0.01) throw new ApiError(422, `${what}: area terlalu kecil.`);
    const r4 = (n: number) => Math.round(n * 10000) / 10000;
    return { x1: r4(x1), y1: r4(y1), x2: r4(x2), y2: r4(y2) };
  });
}

export function validateLayout(cameraId: unknown, raw: unknown): CameraLayout {
  if (typeof cameraId !== "string" || !CAM_ID.test(cameraId)) throw new ApiError(400, "Kamera tidak valid.");
  const o = (raw ?? {}) as Record<string, unknown>;
  let cashier: CameraLayout["cashier"] = null;
  if (o.cashier != null) {
    const c = o.cashier as Record<string, unknown>;
    if (!frac(c.x) || !frac(c.y)) throw new ApiError(422, "Titik kasir tidak valid.");
    const r = typeof c.r === "number" && Number.isFinite(c.r) ? c.r : 0.08;
    if (r < 0.02 || r > 0.4) throw new ApiError(422, "Jangkauan titik kasir 2–40 % lebar gambar.");
    cashier = { x: Math.round((c.x as number) * 10000) / 10000, y: Math.round((c.y as number) * 10000) / 10000,
                r: Math.round(r * 1000) / 1000 };
  }
  let facecam: CameraLayout["facecam"] = null;
  if (o.facecam != null) {
    const f = o.facecam as Record<string, unknown>;
    if (!frac(f.x) || !frac(f.y)) throw new ApiError(422, "Titik kamera wajah tidak valid.");
    facecam = { x: Math.round((f.x as number) * 10000) / 10000, y: Math.round((f.y as number) * 10000) / 10000 };
    if (cashier && Math.hypot(facecam.x - cashier.x, facecam.y - cashier.y) < 0.02)
      throw new ApiError(422, "Titik kamera wajah terlalu dekat dengan titik kasir. Klik tepat di bawah kamera wajah, di meja kasir.");
  }
  return {
    cashier,
    facecam,
    staff: rects(o.staff, "Area staf"),
    exit: rects(o.exit, "Pintu keluar"),
    transition: rects(o.transition, "Area pindah kamera"),
    updated_at: new Date().toISOString(),
  };
}

/** Webcam by stable id, a device index, or an IP camera URL. */
const SOURCE_RE = /^(\d{1,2}|\/dev\/[A-Za-z0-9_.:/+-]{1,200}|(rtsp|rtsps|http|https):\/\/[^\s"'<>]{3,300})$/;

export function validateSource(deviceId: unknown, role: unknown, raw: unknown): CameraSource | null {
  if (typeof deviceId !== "string" || !DEVICE_ID.test(deviceId)) throw new ApiError(400, "Perangkat tidak valid.");
  if (typeof role !== "string" || !["face", "CAM_1", "CAM_2"].includes(role)) throw new ApiError(400, "Peran kamera tidak valid.");
  if (raw == null) return null;                          // remove the choice (device uses its default)
  const o = raw as Record<string, unknown>;
  const source = typeof o.source === "string" ? o.source.trim() : "";
  if (!SOURCE_RE.test(source)) throw new ApiError(422, "Sumber kamera harus webcam (/dev/...), nomor, atau alamat rtsp://.");
  const floor = o.floor == null ? 1 : Number(o.floor);
  if (!Number.isInteger(floor) || floor < 1 || floor > 9) throw new ApiError(422, "Lantai 1–9.");
  return { source, floor, enabled: o.enabled !== false };
}
