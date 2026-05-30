import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "halobro_session";

function clearCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  clearCookie(response);
  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearCookie(response);
  return response;
}