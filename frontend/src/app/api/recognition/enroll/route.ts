import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const phoneNumber = formData.get("phone_number") as string | null;

    if (!name || !name.trim()) {
      return NextResponse.json({ detail: "Nama wajib diisi" }, { status: 422 });
    }

    const supabase = db();

    // 1. Create Customer record in Supabase
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        name: name.trim(),
        phone_number: phoneNumber ? phoneNumber.trim() : null,
        is_active: true,
      })
      .select("customer_id, name")
      .single();

    if (custErr || !customer) {
      console.error("[/api/recognition/enroll] Customer insert error:", custErr);
      return NextResponse.json({ detail: "Gagal menyimpan customer" }, { status: 500 });
    }

    let enrolledEmbedding = false;

    // 2. Fetch latest embedding vector directly from Arduino Uno Q camera server
    const arduinoUrl = process.env.NEXT_PUBLIC_ARDUINO_URL || "http://192.168.18.80:5001";
    try {
      const res = await fetch(`${arduinoUrl}/latest-embedding`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const embeddingVector = json.embedding;

        if (Array.isArray(embeddingVector) && embeddingVector.length === 512) {
          const { error: embErr } = await supabase
            .from("embeddings")
            .insert({
              customer_id: customer.customer_id,
              embedding_vector: embeddingVector,
              model_name: "arcface",
              is_primary: true,
            });

          if (!embErr) {
            enrolledEmbedding = true;
          } else {
            console.error("[/api/recognition/enroll] Embedding insert error:", embErr);
          }
        }
      } else {
        console.warn("[/api/recognition/enroll] Camera endpoint returned:", res.status);
      }
    } catch (e) {
      console.warn("[/api/recognition/enroll] Could not connect to camera server:", e);
    }

    return NextResponse.json({
      customer_id: customer.customer_id,
      name: customer.name,
      enrolled: enrolledEmbedding,
      message: enrolledEmbedding
        ? `Customer "${customer.name}" berhasil didaftarkan dan wajahnya tersimpan!`
        : `Customer "${customer.name}" berhasil didaftarkan! (Wajah tidak terdeteksi, silakan pastikan berdiri di depan kamera)`,
    });
  } catch (e) {
    console.error("[/api/recognition/enroll]", e);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
