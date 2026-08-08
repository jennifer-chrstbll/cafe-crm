/**
 * Lightweight Postgres query helper for Next.js API routes.
 * Uses the Supabase Admin client to run raw SQL via rpc or direct table queries.
 * 
 * We use the Supabase JS client (not pg/psycopg2) so we stay in the JS ecosystem
 * and everything deploys clean on Vercel with zero native binaries.
 */
import { createAdminClient } from "./supabase";

export function db() {
  return createAdminClient();
}

// Segment helper — mirrors Python logic in recognition.py
export function getSegment(visitCount: number): string {
  if (visitCount >= 15) return "VIP";
  if (visitCount >= 5) return "Regular";
  return "New";
}
