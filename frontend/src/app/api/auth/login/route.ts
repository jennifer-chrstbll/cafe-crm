import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ detail: "Email dan password wajib diisi" }, { status: 422 });
    }

    const supabase = db();
    const { data: users, error } = await supabase
      .from("users")
      .select("user_id, name, email, password_hash, role, is_active")
      .eq("email", email)
      .eq("is_active", true)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ detail: "Email atau password salah" }, { status: 401 });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({ detail: "Email atau password salah" }, { status: 401 });
    }

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("user_id", user.user_id);

    const token = await signToken({
      sub: user.user_id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return NextResponse.json({
      access_token: token,
      token_type: "bearer",
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (e) {
    console.error("[/api/auth/login]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
