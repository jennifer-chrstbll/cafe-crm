import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";

async function guard(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  const s = await requireUser(req, ["OWNER"]);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  return { s, id };
}

async function activeOwners() {
  const { count } = await db().from("users").select("user_id", { count: "exact", head: true })
    .eq("role", "OWNER").eq("is_active", true);
  return count ?? 0;
}

/** Change role, (de)activate, or reset password of a staff account. */
export const PATCH = route(async (req: NextRequest, ctx) => {
  const { s, id } = await guard(req, ctx);
  const b = await body<{ role?: string; is_active?: boolean; password?: string; name?: string }>(req);
  const patch: Record<string, unknown> = {};
  if (b.name !== undefined) {
    if (!b.name.trim()) throw new ApiError(422, "Nama tidak boleh kosong.");
    patch.name = b.name.trim();
  }
  if (b.role !== undefined) patch.role = b.role === "OWNER" ? "OWNER" : "CASHIER";
  if (b.is_active !== undefined) patch.is_active = !!b.is_active;
  if (b.password !== undefined) {
    if (b.password.length < 8) throw new ApiError(422, "Kata sandi minimal 8 karakter.");
    patch.password_hash = await bcrypt.hash(b.password, 10);
  }
  if (id === s.sub && (patch.is_active === false || patch.role === "CASHIER")) {
    throw new ApiError(409, "Anda tidak dapat menonaktifkan atau menurunkan akun sendiri.");
  }
  if ((patch.is_active === false || patch.role === "CASHIER")) {
    const { data: target } = await db().from("users").select("role").eq("user_id", id).maybeSingle();
    if (target?.role === "OWNER" && (await activeOwners()) <= 1) {
      throw new ApiError(409, "Harus ada minimal satu pemilik aktif.");
    }
  }
  const { error } = await db().from("users").update(patch).eq("user_id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
