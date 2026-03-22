import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateCsrfToken } from "@/lib/middleware/csrf";
import { securityHeaders } from "@/lib/middleware/security";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set("x-request-id", requestId);

  if (!request.cookies.has("csrf-token")) {
    const token = generateCsrfToken();
    response.cookies.set("csrf-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
