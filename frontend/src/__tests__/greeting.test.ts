import { describe, expect, it } from "vitest";
import { callName, greetings } from "@/components/pos/greeting";

describe("cashier greeting script", () => {
  it("uses the first name", () => {
    expect(callName("Jennifer Christabel")).toBe("Jennifer");
    expect(callName("  A ")).toBe("A");
  });
  it("new customers get a recommendation or a welcome", () => {
    const g = greetings({ name: "Budi", visitCount: 1, recommendation: "Kopi Susu", hasTab: false, loyal: false }, "s");
    expect(g.length).toBeGreaterThan(1);
    expect(g.every((l) => l.includes("Budi"))).toBe(true);
    expect(g.some((l) => l.includes("Kopi Susu"))).toBe(true);
  });
  it("returning customers are offered their favourite", () => {
    const g = greetings({ name: "Sari", visitCount: 4, favorite: "Latte", hasTab: false, loyal: false }, "s");
    expect(g.every((l) => l.includes("Latte"))).toBe(true);
  });
  it("loyal customers are offered something new", () => {
    const g = greetings({ name: "Sari", visitCount: 6, favorite: "Latte", discover: "Matcha", hasTab: false, loyal: true }, "s");
    expect(g.some((l) => l.includes("Matcha"))).toBe(true);
  });
  it("same seed = same order (stable during a visit), different seed = rotated", () => {
    const inp = { name: "Budi", visitCount: 1, recommendation: "Kopi", hasTab: false, loyal: false };
    expect(greetings(inp, "a")).toEqual(greetings(inp, "a"));
    const orders = new Set(["a", "b", "c", "d", "e", "f"].map((s) => greetings(inp, s)[0]));
    expect(orders.size).toBeGreaterThan(1);
  });
  it("mentions the open tab", () => {
    const g = greetings({ name: "Budi", visitCount: 1, hasTab: true, loyal: false }, "s");
    expect(g.every((l) => l.includes("tagihan"))).toBe(true);
  });
});
