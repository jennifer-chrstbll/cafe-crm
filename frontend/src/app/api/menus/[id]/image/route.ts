import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Menu photo (owner). The browser already shrank it to a 320 px square (±15-30 KB), so the
 * Kasir screen stays fast. Stored in Supabase Storage (public bucket "menu", created on first
 * use) with a one-year cache: every browser downloads each photo only once.
 */
const BUCKET = "menu";
const MAX_BYTES = 400_000;
let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const sb = db();
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    });
    if (error && !/exist/i.test(error.message)) throw new Error(error.message);
  }
  bucketReady = true;
}

async function removeAll(id: string, keep?: string) {
  const sb = db();
  const { data } = await sb.storage.from(BUCKET).list(id);
  const old = (data ?? []).map((f) => `${id}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await sb.storage.from(BUCKET).remove(old);
}

export const PUT = route(async (req: NextRequest, ctx) => {
  await requireUser(req, ["OWNER"]);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  const b = await body<{ data?: string }>(req);
  const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(b.data ?? "");
  if (!m) throw new ApiError(422, "Gambar tidak valid (webp/jpg/png).");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_BYTES) throw new ApiError(413, "Gambar terlalu besar (maks 400 KB).");
  await ensureBucket();
  const sb = db();
  const path = `${id}/${Date.now()}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
  const up = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: `image/${m[1]}`, cacheControl: "31536000", upsert: false,
  });
  if (up.error) throw new Error(up.error.message);
  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("menu").update({ image_url: url, updated_at: new Date().toISOString() }).eq("menu_id", id);
  if (error) throw new Error(error.message);
  await removeAll(id, path);
  return json({ image_url: url });
});

export const DELETE = route(async (req: NextRequest, ctx) => {
  await requireUser(req, ["OWNER"]);
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new ApiError(400, "ID tidak valid.");
  await ensureBucket();
  await removeAll(id);
  const { error } = await db().from("menu").update({ image_url: null, updated_at: new Date().toISOString() }).eq("menu_id", id);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
