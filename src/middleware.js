import { NextResponse } from "next/server";

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:4200,http://localhost:3500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function getCorsOrigin(request) {
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0];
}

export function middleware(request) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const corsOrigin = getCorsOrigin(request);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          Vary: "Origin"
        }
      });
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Vary", "Origin");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*"
};
