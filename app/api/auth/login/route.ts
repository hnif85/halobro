import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createAdminClient } from "@/lib/supabase";

const SECRET = process.env.JWT_SECRET as string;
if (!SECRET) throw new Error("JWT_SECRET environment variable is required");
const COOKIE_NAME = "halobro_session";

// Simple in-memory rate limiter: 5 attempts / 15 min per IP + per email
const rateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function resetRateLimit(key: string): void {
  rateMap.delete(key);
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateMap) {
    if (now > v.resetAt) rateMap.delete(k);
  }
}, 60000);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    // Rate limit by IP and email
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip) || !checkRateLimit(`email:${email}`)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    }

    const supabase = await createAdminClient();

    const { data: user, error } = await supabase
      .from("crm_users")
      .select("id, email, password_hash, name, role, is_active")
      .eq("email", email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Akun tidak aktif" }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      SECRET,
      { expiresIn: "90d" }
    );

    resetRateLimit(ip);
    resetRateLimit(`email:${email}`);

    const maxAgeSeconds = 90 * 24 * 60 * 60;
    const isProduction = process.env.NODE_ENV === "production";
    const cookieValue = `${COOKIE_NAME}=${token}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${isProduction ? "; Secure" : ""}`;

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    response.headers.set("Set-Cookie", cookieValue);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}