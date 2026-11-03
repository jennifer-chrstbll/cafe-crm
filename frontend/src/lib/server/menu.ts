import { ApiError } from "./http";
import { MENU_CATEGORIES } from "./payments";

export function validateMenu(b: Record<string, unknown>, partial = false) {
  const out: Record<string, unknown> = {};
  if (!partial || "name" in b) {
    const name = String(b.name ?? "").trim();
    if (!name) throw new ApiError(422, "Nama menu wajib diisi.");
    out.name = name;
  }
  if (!partial || "category" in b) {
    if (!MENU_CATEGORIES.includes(b.category as never)) throw new ApiError(422, "Kategori tidak valid.");
    out.category = b.category;
  }
  if (!partial || "price" in b) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) throw new ApiError(422, "Harga harus lebih dari 0.");
    out.price = Math.round(price);
  }
  if ("description" in b) out.description = String(b.description ?? "").trim() || null;
  if ("is_active" in b) out.is_active = !!b.is_active;
  return out;
}
