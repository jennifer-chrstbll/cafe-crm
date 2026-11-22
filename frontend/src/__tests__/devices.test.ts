import { describe, expect, it } from "vitest";
import { camerasOf, isOnline, parseCameraKey } from "@/lib/server/devices";

const now = new Date().toISOString();
const old = new Date(Date.now() - 60_000).toISOString();

describe("devices", () => {
  it("online = heartbeat within 45 s", () => {
    expect(isOnline({ last_seen_at: now })).toBe(true);
    expect(isOnline({ last_seen_at: old })).toBe(false);
  });
  it("parses camera keys", () => {
    expect(parseCameraKey("pi-001/CAM_1")).toEqual({ device_id: "pi-001", camera: "CAM_1" });
    expect(() => parseCameraKey("pi-001")).toThrow();
    expect(() => parseCameraKey("../x/CAM_1")).toThrow();
  });
  it("lists cameras with the owner's names", () => {
    const cams = camerasOf([
      { device_id: "uno-q-001", kind: "facerec", last_seen_at: now, info: { camera: { ok: true, width: 640, height: 480 } } },
      { device_id: "pi-001", kind: "persontrack", last_seen_at: now,
        info: { cameras: [{ id: "CAM_1", floor: 1, ok: true }, { id: "CAM_2", floor: 1, ok: true }] } },
    ], { "pi-001": { CAM_2: "Area duduk" } });
    expect(cams.map((c) => c.label)).toEqual(["Kamera wajah (kasir)", "Kamera area 1", "Area duduk"]);
    expect(cams[1].key).toBe("pi-001/CAM_1");
  });
  it("shows the floor only when the cameras are on different floors", () => {
    const cams = camerasOf([{ device_id: "pi-001", kind: "persontrack", last_seen_at: now,
      info: { cameras: [{ id: "CAM_1", floor: 1 }, { id: "CAM_2", floor: 2 }] } }]);
    expect(cams.map((c) => c.label)).toEqual(["Kamera area 1 · lantai 1", "Kamera area 2 · lantai 2"]);
  });
});
