import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client (service_role key, bypasses RLS).
 * Import it only from API route handlers. The browser never talks to Supabase
 * directly: RLS is enabled with no policies (migration 004), so the public anon
 * key cannot read any table.
 */
let admin: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}
