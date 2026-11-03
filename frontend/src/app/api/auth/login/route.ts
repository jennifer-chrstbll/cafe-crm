import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_HOURS, signToken, Role } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";

// Simple per-instance brute-force brake: 8 failures per email per 10 minutes.
const failures = new Map<string, { n: number; until: number }>();

export const POST = route(async (req: NextRequest) => {
  const { email, password } = await body<{ email?: string; password?: string }>(req);
  if (!email || !password) throw new ApiError(422, "Email dan kata sandi wajib diisi.");
  const key = email.trim().toLowerCase();

  const f = failures.get(key);
  if (f && f.n >= 8 && Date.now() < f.until) {
    throw new ApiError(429, "Terlalu banyak percobaan. Coba lagi dalam 10 menit.");
  }

  const { data: user } = await db()
    .from("users")
    .select("user_id, name, email, password_hash, role, is_active")
    .ilike("email", key)
    .maybeSingle();

  const ok = !!user && user.is_active !== false && (await bcrypt.compare(password, user.password_hash ?? ""));
  if (!ok) {
    const cur = failures.get(key);
    failures.set(key, { n: (cur && Date.now() < cur.until ? cur.n : 0) + 1, until: Date.now() + 10 * 60_000 });
    throw new ApiError(401, "Email atau kata sandi salah.");
  }
  failures.delete(key);

  await db().from("users").update({ last_login: new Date().toISOString() }).eq("user_id", user.user_id);
  const session = { sub: user.user_id, role: user.role as Role, name: user.name, email: user.email };
  const token = await signToken(session);

  const res = json({ user_id: user.user_id, name: user.name, email: user.email, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_HOURS * 3600,
  });
  return res;
});
