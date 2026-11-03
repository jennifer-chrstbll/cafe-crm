import { NextRequest } from "next/server";
import { db, GUEST_ID } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { customerContext } from "@/lib/server/customers";

export const dynamic = "force-dynamic";

async function idOf(ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  if (!isUuid(id) || id === GUEST_ID) throw new ApiError(404, "Pelanggan tidak ditemukan.");
  return id;
}

export const GET = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const c = await customerContext(await idOf(ctx));
  if (!c) throw new ApiError(404, "Pelanggan tidak ditemukan.");
  return json(c);
});

const EDITABLE = ["name", "phone_number", "email", "notes", "gender", "date_of_birth"] as const;

export const PATCH = route(async (req: NextRequest, ctx) => {
  await requireUser(req);
  const id = await idOf(ctx);
  const b = await body<Record<string, unknown>>(req);
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in b) patch[k] = typeof b[k] === "string" ? (b[k] as string).trim() || null : b[k];
  }
  if ("name" in patch && !patch.name) throw new ApiError(422, "Nama tidak boleh kosong.");
  const { error } = await db().from("customers").update(patch).eq("customer_id", id);
  if (error) {
    if (error.message.includes("duplicate")) throw new ApiError(409, "Nomor HP sudah dipakai pelanggan lain.");
    throw new Error(error.message);
  }
  return json({ ok: true });
});

/**
 * Right to erasure (UU PDP): delete the face embeddings and personal data.
 * Sales history stays for the cafe's bookkeeping but is no longer linked to a name.
 */
export const DELETE = route(async (req: NextRequest, ctx) => {
  await requireUser(req, ["OWNER"]);
  const id = await idOf(ctx);
  const sb = db();
  await sb.from("embeddings").delete().eq("customer_id", id);
  const { error } = await sb.from("customers").update({
    name: "Pelanggan dihapus", phone_number: null, email: null, notes: null, gender: null,
    date_of_birth: null, is_active: false, consent_given: false,
  }).eq("customer_id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
