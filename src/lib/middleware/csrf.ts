import { NextRequest } from "next/server";
import { createErrorResponse } from "@/lib/middleware/errorHandler";

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function validateCsrfToken(req: NextRequest, token: string): boolean {
  const headerToken = req.headers.get(CSRF_HEADER);
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;

  // For GET requests, skip validation
  if (SAFE_METHODS.includes(req.method)) {
    return true;
  }

  // For mutations, validate token matches
  return headerToken === cookieToken && cookieToken === token;
}

export function withCsrfProtection<TContext = unknown>(
  handler: (req: NextRequest, context: TContext) => Promise<Response>,
) {
  return async (req: NextRequest, context: TContext) => {
    // Skip CSRF for GET/HEAD/OPTIONS
    if (SAFE_METHODS.includes(req.method)) {
      return await handler(req, context);
    }

    // For mutations, accept either a standard double-submit token or a same-origin browser request.
    const token = req.headers.get(CSRF_HEADER);
    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    const fetchSite = req.headers.get("sec-fetch-site");

    const originMatchesHost =
      !!origin &&
      !!host &&
      (() => {
        try {
          return new URL(origin).host === host;
        } catch {
          return false;
        }
      })();

    const isSameSiteBrowserRequest =
      fetchSite === null ||
      fetchSite === "same-origin" ||
      fetchSite === "same-site" ||
      fetchSite === "none";

    const hasValidHeader = !!token && !!cookieToken && token === cookieToken;
    const hasValidSameOriginFallback =
      !!cookieToken && originMatchesHost && isSameSiteBrowserRequest;

    if (!hasValidHeader && !hasValidSameOriginFallback) {
      return createErrorResponse(
        "CSRF_VALIDATION_FAILED",
        "CSRF token invalid or missing",
        403,
      );
    }

    return handler(req, context);
  };
}
