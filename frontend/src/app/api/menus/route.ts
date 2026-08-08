import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await db()
      .from("menu")
      .select("menu_id, name, description, category, price, is_active")
      .eq("is_active", true)
      .order("category")
      .order("name");

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[/api/menus GET]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, category, price } = body;

    const validCategories = ["COFFEE", "NON_COFFEE", "FOOD", "DESSERT"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ detail: "Invalid category" }, { status: 400 });
    }

    const { data, error } = await db()
      .from("menu")
      .insert({ name, description, category, price, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[/api/menus POST]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
