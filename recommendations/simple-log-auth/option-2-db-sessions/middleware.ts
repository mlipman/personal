import { NextRequest, NextResponse } from "next/server";
import { findValidDeviceSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await findValidDeviceSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const loginPage = request.nextUrl.pathname === "/login";

  if (loginPage) return session ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (session) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
};
