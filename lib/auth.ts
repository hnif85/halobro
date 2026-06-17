import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.JWT_SECRET as string;
if (!SECRET) throw new Error("JWT_SECRET environment variable is required");
const COOKIE_NAME = "halobro_session";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      const allCookies = cookieStore.getAll();
      for (const c of allCookies) {
        if (c.name === COOKIE_NAME) { token = c.value; break; }
      }
    }
    if (!token) return null;

    const payload = jwt.verify(token, SECRET) as unknown as SessionUser;
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): SessionUser | null {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    return jwt.verify(token, SECRET) as unknown as SessionUser;
  } catch {
    return null;
  }
}