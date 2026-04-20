import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = [
  "/settings",
  "/analyze",
  "/dashboard",
  "/history",
  "/search",
];
const AUTH_ONLY = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("access-token")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthOnly && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
