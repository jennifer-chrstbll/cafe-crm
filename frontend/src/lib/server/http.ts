import { NextRequest, NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

type Ctx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/** Wraps a route handler: ApiError -> {detail} with its status, anything else -> 500. */
export function route(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return json({ detail: e.message }, e.status);
      console.error(`[${req.method} ${req.nextUrl.pathname}]`, e);
      return json({ detail: "Terjadi kesalahan di server. Coba lagi." }, 500);
    }
  };
}

/** Throw on a Supabase error, otherwise return the data. */
export function must<T>(res: { data: T; error: { message: string } | null }, what = "query"): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Body request harus JSON.");
  }
}

export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
