import { NextRequest, NextResponse } from "next/server";
// Edge-safe import: lib/auth.ts reaches the database and cannot load here.
// This check is a pre-filter only — getSession() on the page is authoritative
// and is what enforces session revocation.
import { verifyToken } from "@/lib/auth-edge";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sl_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/account/:path*"],
};
