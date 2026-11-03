import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const { data, error } = await db().from("users")
    .select("user_id, name, email, role, is_active, last_login, created_at").order("created_at");
  if (error) throw new Error(error.message);
  return json(data ?? []);
});

export const POST = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const b = await body<{ name?: string; email?: string; password?: string; role?: string }>(req);
  const name = b.name?.trim();
  const email = b.email?.trim().toLowerCase();
  if (!name || !email) throw new ApiError(422, "Nama dan email wajib diisi.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError(422, "Format email tidak valid.");
  if (!b.password || b.password.length < 8) throw new ApiError(422, "Kata sandi minimal 8 karakter.");
  const role = b.role === "OWNER" ? "OWNER" : "CASHIER";
  const { data, error } = await db().from("users")
    .insert({ name, email, role, password_hash: await bcrypt.hash(b.password, 10), is_active: true })
    .select("user_id, name, email, role, is_active, created_at").single();
  if (error) {
    if (error.message.includes("duplicate")) throw new ApiError(409, "Email sudah dipakai akun lain.");
    throw new Error(error.message);
  }
  return json(data, 201);
});
