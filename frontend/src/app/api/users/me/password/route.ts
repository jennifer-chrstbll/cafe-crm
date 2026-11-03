import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";

export const PUT = route(async (req: NextRequest) => {
  const s = await requireUser(req);
  const { current_password, new_password } = await body<{ current_password?: string; new_password?: string }>(req);
  if (!new_password || new_password.length < 8) throw new ApiError(422, "Kata sandi baru minimal 8 karakter.");
  const { data: u } = await db().from("users").select("password_hash").eq("user_id", s.sub).maybeSingle();
  if (!u || !(await bcrypt.compare(current_password ?? "", u.password_hash ?? ""))) {
    throw new ApiError(401, "Kata sandi saat ini salah.");
  }
  const { error } = await db().from("users")
    .update({ password_hash: await bcrypt.hash(new_password, 10) }).eq("user_id", s.sub);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
