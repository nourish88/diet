import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;

  console.log("🛡️ Middleware checking:", pathname);

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If it's a public route, allow access
  if (isPublicRoute) {
    console.log("✅ Public route, allowing access");
    return NextResponse.next();
  }

  // ANALYZE SUPABASE COOKIES
  console.log(
    "🍪 All cookies:",
    request.cookies.getAll().map((c) => ({
      name: c.name,
      value: c.value.substring(0, 50) + "...", // İlk 50 karakter
      hasValue: !!c.value,
    }))
  );

  // Check for any Supabase-related cookie
  const allCookies = request.cookies.getAll();
  console.log("🍪 All cookies:", allCookies);
  const supabaseCookies = allCookies.filter(
    (cookie) =>
      cookie.name.includes("sb-") ||
      cookie.name.includes("supabase") ||
      cookie.name.includes("auth")
  );

  console.log(
    "🍪 Supabase-related cookies:",
    supabaseCookies.map((c) => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value.length,
    }))
  );

  // If we have any Supabase cookie, allow access
  if (supabaseCookies.length > 0) {
    console.log("✅ Supabase cookies found, allowing access");
    return NextResponse.next();
  }

  // No Supabase cookies, redirect to login
  console.log("❌ No Supabase cookies, redirecting to login");
  return NextResponse.redirect(new URL("/login", request.url));
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
