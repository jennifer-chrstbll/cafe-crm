import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ detail: "Token tidak valid" }, { status: 401 });

  const { data: users } = await db()
    .from("users")
    .select("user_id, name, email, role, is_active, created_at")
    .eq("user_id", payload.sub as string)
    .limit(1);

  if (!users || users.length === 0) {
    return NextResponse.json({ detail: "User tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(users[0]);
}
