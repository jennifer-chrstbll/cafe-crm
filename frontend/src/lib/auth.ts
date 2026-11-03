import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { ApiError } from "./server/http";

export type Role = "OWNER" | "CASHIER" | "ADMIN";
export interface Session {
  sub: string;
  role: Role;
  name: string;
  email: string;
}

export const SESSION_COOKIE = "cafe_session";
export const SESSION_HOURS = 12; // one shift + margin

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set (>= 32 chars) in production");
    }
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(s);
}

export async function signToken(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

function tokenFrom(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

export const isOwnerLevel = (r: Role) => r === "OWNER" || r === "ADMIN";

/** Every data route calls this. roles = allowed roles (OWNER implies ADMIN). */
export async function requireUser(req: NextRequest, roles?: Role[]): Promise<Session> {
  const token = tokenFrom(req);
  const session = token ? await verifyToken(token) : null;
  if (!session) throw new ApiError(401, "Sesi berakhir. Silakan masuk lagi.");
  if (roles && !roles.includes(session.role) && !(roles.includes("OWNER") && isOwnerLevel(session.role))) {
    throw new ApiError(403, "Halaman ini hanya untuk pemilik kafe.");
  }
  return session;
}

/** Edge devices (UNO Q, Raspberry Pi) authenticate with a shared key header. */
export function isDevice(req: NextRequest): boolean {
  const key = process.env.DEVICE_API_KEY;
  return !!key && req.headers.get("x-device-key") === key;
}

export async function requireUserOrDevice(req: NextRequest): Promise<Session | "device"> {
  if (isDevice(req)) return "device";
  return requireUser(req);
}
