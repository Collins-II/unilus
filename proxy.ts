import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { STUDENT_SESSION_COOKIE } from "@/lib/session-cookie";

const PUBLIC_PAGES = ["/", "/login", "/contact", "/navigation"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/register", "/api/programmes", "/api/locations", "/api/route", "/api/commerce/callback", "/api/commerce/catalog"];

function isPublic(pathname: string) {
  if (PUBLIC_PAGES.includes(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Requires a student session for every page and API route except the public campus pages and auth endpoints. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    cookieName: STUDENT_SESSION_COOKIE,
  });
  if (token && (token.role ?? "student") === "student") return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|sw.js|workbox-|fallback-|manifest.json|offline.html|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|js|json|txt|xml|webmanifest)$).*)",
  ],
};
