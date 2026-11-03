import { NextRequest } from "next/server";
import { db, fetchAll, getSegment, GUEST_ID } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/customers?search=&segment=VIP|Regular|New&sort=name|recent|visits&offset=&limit= */
export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  const p = req.nextUrl.searchParams;
  const search = (p.get("search") ?? "").trim().toLowerCase();
  const segment = p.get("segment");
  const sort = p.get("sort") ?? "recent";
  const limit = Math.min(parseInt(p.get("limit") ?? "24"), 200);
  const offset = Math.max(parseInt(p.get("offset") ?? "0"), 0);
  const sb = db();

  const [customers, visits, faces] = await Promise.all([
    fetchAll<any>((a, b) => sb.from("customers")
      .select("customer_id, name, phone_number, created_at, consent_given")
      .eq("is_active", true).neq("customer_id", GUEST_ID).range(a, b) as never),
    fetchAll<{ customer_id: string; entry_time: string }>((a, b) =>
      sb.from("visits").select("customer_id, entry_time").neq("customer_id", GUEST_ID).range(a, b) as never),
    fetchAll<{ customer_id: string }>((a, b) =>
      sb.from("embeddings").select("customer_id").not("customer_id", "is", null).range(a, b) as never),
  ]);

  const stats = new Map<string, { n: number; last: string | null }>();
  for (const v of visits) {
    const s = stats.get(v.customer_id) ?? { n: 0, last: null };
    s.n++;
    if (!s.last || v.entry_time > s.last) s.last = v.entry_time;
    stats.set(v.customer_id, s);
  }
  const withFace = new Set(faces.map((f) => f.customer_id));

  let rows = customers.map((c) => {
    const s = stats.get(c.customer_id) ?? { n: 0, last: null };
    return { ...c, visit_count: s.n, last_visit: s.last, segment: getSegment(s.n), has_face: withFace.has(c.customer_id) };
  });
  if (search) {
    rows = rows.filter((c) => c.name.toLowerCase().includes(search) || (c.phone_number ?? "").includes(search));
  }
  if (segment) rows = rows.filter((c) => c.segment === segment);
  rows.sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name, "id")
    : sort === "visits" ? b.visit_count - a.visit_count
    : (b.last_visit ?? b.created_at).localeCompare(a.last_visit ?? a.created_at));

  return json({ total: rows.length, items: rows.slice(offset, offset + limit) });
});

/** Create a customer without a face (e.g. phone-only member). Face enrollment: POST /api/enrollment. */
export const POST = route(async (req: NextRequest) => {
  await requireUser(req);
  const b = await body<{ name?: string; phone_number?: string; notes?: string }>(req);
  const name = b.name?.trim();
  if (!name) throw new ApiError(422, "Nama pelanggan wajib diisi.");
  const phone = b.phone_number?.trim() || null;
  if (phone) {
    const { data: dup } = await db().from("customers").select("name").eq("phone_number", phone).maybeSingle();
    if (dup) throw new ApiError(409, `Nomor HP ini sudah terdaftar atas nama ${dup.name}.`);
  }
  const { data, error } = await db().from("customers")
    .insert({ name, phone_number: phone, notes: b.notes?.trim() || null, is_active: true })
    .select("customer_id, name").single();
  if (error) throw new Error(error.message);
  return json(data, 201);
});
