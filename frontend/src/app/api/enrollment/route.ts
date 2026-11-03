import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, body, isUuid, json, route } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

/**
 * Register a customer's face. The website runs in the cloud and cannot reach the
 * UNO Q on the cafe LAN, so it queues an enrollment request; the UNO Q captures
 * an averaged template of the person in front of the cashier camera and writes
 * the embedding itself. The page polls GET /api/enrollment/[id] for the result.
 *
 * Body: { consent: true, name?, phone_number?, customer_id? (existing customer) }
 */
export const POST = route(async (req: NextRequest) => {
  const s = await requireUser(req);
  const b = await body<{ consent?: boolean; name?: string; phone_number?: string; customer_id?: string }>(req);
  if (b.consent !== true) {
    throw new ApiError(422, "Pelanggan harus menyetujui penyimpanan data wajah terlebih dahulu.");
  }
  const sb = db();
  const now = new Date().toISOString();
  let customerId = b.customer_id;

  if (customerId) {
    if (!isUuid(customerId)) throw new ApiError(400, "ID pelanggan tidak valid.");
    const { error } = await sb.from("customers")
      .update({ consent_given: true, consent_given_at: now }).eq("customer_id", customerId);
    if (error) throw new Error(error.message);
  } else {
    const name = b.name?.trim();
    if (!name) throw new ApiError(422, "Nama pelanggan wajib diisi.");
    const phone = b.phone_number?.trim() || null;
    if (phone) {
      const { data: dup } = await sb.from("customers").select("name").eq("phone_number", phone).maybeSingle();
      if (dup) throw new ApiError(409, `Nomor HP ini sudah terdaftar atas nama ${dup.name}.`);
    }
    const { data, error } = await sb.from("customers")
      .insert({ name, phone_number: phone, is_active: true, consent_given: true, consent_given_at: now })
      .select("customer_id").single();
    if (error) throw new Error(error.message);
    customerId = data.customer_id;
  }

  const settings = await getSettings();
  const { data: reqRow, error } = await sb.from("enrollment_requests")
    .insert({ customer_id: customerId, camera_id: settings.devices.cashier_camera_id, created_by: s.sub })
    .select("request_id").single();
  if (error) throw new Error(error.message);
  return json({ request_id: reqRow.request_id, customer_id: customerId }, 201);
});
