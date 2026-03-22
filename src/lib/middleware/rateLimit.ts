import { NextRequest } from "next/server";
import { createErrorResponse } from "@/lib/middleware/errorHandler";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (for single-server deployment)
// For multi-server, use Redis
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number; // time window in ms
  maxRequests: number; // max requests per window
}

export function getRateLimitKey(req: NextRequest): string {
  // Use IP address or auth token
  const forwarded = req.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  return firstForwarded || "unknown";
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, resetAt: now + config.windowMs };
  }

  if (entry.count < config.maxRequests) {
    entry.count++;
    return { allowed: true, resetAt: entry.resetAt };
  }

  return { allowed: false, resetAt: entry.resetAt };
}

export function withRateLimit<TContext = unknown>(
  config: RateLimitConfig,
  handler: (req: NextRequest, context: TContext) => Promise<Response>,
) {
  return async (req: NextRequest, context: TContext) => {
    const key = getRateLimitKey(req);
    const { allowed, resetAt } = checkRateLimit(key, config);

    if (!allowed) {
      const retryAfter = String(Math.ceil((resetAt - Date.now()) / 1000));
      const response = createErrorResponse(
        "RATE_LIMIT_EXCEEDED",
        "Too many requests",
        429,
        { resetAt: new Date(resetAt).toISOString() },
      );
      response.headers.set("Retry-After", retryAfter);
      return response;
    }

    return await handler(req, context);
  };
}
