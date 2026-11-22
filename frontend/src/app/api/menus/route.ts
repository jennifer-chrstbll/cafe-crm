import { NextRequest } from "next/server";
import { db, num } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { body, json, route } from "@/lib/server/http";
import { validateMenu } from "@/lib/server/menu";

export const dynamic = "force-dynamic";

/** GET /api/menus            active items (POS)
 *  GET /api/menus?all=1      every item incl. hidden ones (owner, menu management) */
export const GET = route(async (req: NextRequest) => {
  const s = await requireUser(req);
  const all = req.nextUrl.searchParams.get("all") === "1" && s.role !== "CASHIER";
  let q = db().from("menu").select("menu_id, name, description, category, price, is_active, image_url")
    .order("category").order("name");
  if (!all) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return json((data ?? []).map((m) => ({ ...m, price: num(m.price) })));
});

export const POST = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  const row = validateMenu(await body(req));
  const { data, error } = await db().from("menu").insert({ ...row, is_active: true }).select().single();
  if (error) throw new Error(error.message);
  return json(data, 201);
});
