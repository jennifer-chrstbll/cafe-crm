import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const s = await requireUser(req);
  const { data } = await db()
    .from("users")
    .select("user_id, name, email, role, is_active, created_at")
    .eq("user_id", s.sub)
    .maybeSingle();
  if (!data || data.is_active === false) throw new ApiError(401, "Akun tidak aktif.");
  return json(data);
});
