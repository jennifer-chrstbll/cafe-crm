import { describe, expect, it } from "vitest";
import { validateLayout, validateSource } from "@/lib/server/layout";

describe("validateLayout (Tata Letak Kamera)", () => {
  it("keeps a valid layout and rounds coordinates", () => {
    const l = validateLayout("CAM_1", {
      cashier: { x: 0.123456, y: 0.5, r: 0.08 }, facecam: { x: 0.12, y: 0.3 },
      staff: [{ x1: 0.3, y1: 0.1, x2: 0.1, y2: 0.2 }], exit: [], transition: [],
    });
    expect(l.cashier).toEqual({ x: 0.1235, y: 0.5, r: 0.08 });
    expect(l.facecam).toEqual({ x: 0.12, y: 0.3 });
    expect(l.staff).toEqual([{ x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.2 }]);        // corners sorted
    expect(l.updated_at).toBeTruthy();
  });
  it("rejects bad input", () => {
    expect(() => validateLayout("CAM 1", {})).toThrow();                        // bad camera id
    expect(() => validateLayout("CAM_1", { cashier: { x: 2, y: 0.5 } })).toThrow();
    expect(() => validateLayout("CAM_1", { cashier: { x: 0.5, y: 0.5, r: 0.9 } })).toThrow();
    expect(() => validateLayout("CAM_1", { staff: [{ x1: 0.1, y1: 0.1, x2: 0.105, y2: 0.5 }] })).toThrow(); // too small
    expect(() => validateLayout("CAM_1", { staff: Array(11).fill({ x1: 0, y1: 0, x2: 0.5, y2: 0.5 }) })).toThrow();
  });
  it("refuses a face camera point on top of the cashier point", () => {
    expect(() => validateLayout("CAM_1", { cashier: { x: 0.5, y: 0.5 }, facecam: { x: 0.505, y: 0.5 } })).toThrow();
  });
  it("defaults the cashier radius", () => {
    expect(validateLayout("CAM_1", { cashier: { x: 0.5, y: 0.5 } }).cashier?.r).toBe(0.08);
  });
});

describe("validateSource (Perangkat → pilih kamera)", () => {
  it("accepts webcams, indexes and RTSP", () => {
    expect(validateSource("pi-001", "CAM_1", { source: "/dev/v4l/by-id/usb-046d_0825-video-index0" })?.floor).toBe(1);
    expect(validateSource("pi-001", "CAM_2", { source: "rtsp://u:p@192.168.1.50:554/s1", floor: 2 })?.floor).toBe(2);
    expect(validateSource("uno-q-001", "face", { source: "0" })?.enabled).toBe(true);
    expect(validateSource("pi-001", "CAM_1", null)).toBeNull();
  });
  it("rejects anything else", () => {
    expect(() => validateSource("pi-001", "CAM_3", { source: "0" })).toThrow();
    expect(() => validateSource("pi-001", "CAM_1", { source: "C:/x.mp4" })).toThrow();
    expect(() => validateSource("pi-001", "CAM_1", { source: "0", floor: 12 })).toThrow();
  });
});
