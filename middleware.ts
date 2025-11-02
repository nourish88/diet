import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Skip middleware for static files
  const staticFileExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".json",
    ".js",
    ".css",
  ];
  if (staticFileExtensions.some((ext) => pathname.endsWith(ext))) {
    return response;
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/register-client",
    "/pending-approval",
  ];
  if (publicRoutes.includes(pathname)) {
    return response;
  }

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("❌ No authenticated user, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("✅ Authenticated user:", user.email);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (static files and images)
     * - favicon.ico, manifest.json (static files)
     * - Static file extensions are handled by checking pathname in middleware
     */
    "/((?!api|_next|favicon.ico|manifest.json).*)",
  ],
};
