import { NextResponse } from "next/server";

// Define allowed origins based on environment
const getAllowedOrigins = () => {
  const baseOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

  // Add production origins if they exist
  if (process.env.NEXT_PUBLIC_APP_URL) {
    baseOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Add additional allowed origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(",");
    baseOrigins.push(...additionalOrigins);
  }

  return baseOrigins;
};

export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = getAllowedOrigins();

  // If origin is provided, check if it's allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV === "development") {
    // In development, allow localhost origins
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else {
    // In production, use the first allowed origin as default
    response.headers.set(
      "Access-Control-Allow-Origin",
      allowedOrigins[0] || "*"
    );
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}

export function handleCors(request: Request) {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin");
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response, origin || undefined);
  }
  return null;
}

export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}
