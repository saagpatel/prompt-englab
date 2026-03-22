/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateCsrfToken,
  validateCsrfToken,
  withCsrfProtection,
} from "@/lib/middleware/csrf";
import {
  checkRateLimit,
  getRateLimitKey,
  withRateLimit,
} from "@/lib/middleware/rateLimit";
import {
  createErrorResponse,
  handleApiError,
} from "@/lib/middleware/errorHandler";
import { validateRequest, withValidation } from "@/lib/middleware/validation";

function makeRequest(options?: {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const method = options?.method || "GET";
  const headers = new Headers(options?.headers || {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const body = options?.body ? JSON.stringify(options.body) : undefined;
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    headers,
    body,
  });
}

describe("csrf middleware", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("generates a token", () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(token.length).toBe(64);
  });

  it("validates safe methods without token", () => {
    const req = makeRequest({ method: "GET" });
    expect(validateCsrfToken(req, "unused")).toBe(true);
  });

  it("fails token validation for mismatched values on mutations", () => {
    const req = makeRequest({
      method: "POST",
      headers: {
        cookie: "csrf-token=one",
        "x-csrf-token": "two",
      },
    });
    expect(validateCsrfToken(req, "one")).toBe(false);
  });

  it("validates mutation when header and cookie token match", async () => {
    const token = "abc123";
    const req = makeRequest({
      method: "POST",
      headers: {
        cookie: `csrf-token=${token}`,
        "x-csrf-token": token,
      },
    });

    const handler = withCsrfProtection(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );
    const response = await handler(req, undefined);

    expect(response.status).toBe(200);
  });

  it("allows same-origin browser fallback", async () => {
    const req = makeRequest({
      method: "POST",
      headers: {
        cookie: "csrf-token=fallback-token",
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "sec-fetch-site": "same-origin",
      },
    });

    const handler = withCsrfProtection(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );
    const response = await handler(req, undefined);

    expect(response.status).toBe(200);
  });

  it("rejects invalid mutation requests", async () => {
    const req = makeRequest({ method: "POST" });
    const handler = withCsrfProtection(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );
    const response = await handler(req, undefined);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe("CSRF_VALIDATION_FAILED");
  });
});

describe("rate limit middleware", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("extracts first forwarded IP", () => {
    const req = makeRequest({
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
    });
    expect(getRateLimitKey(req)).toBe("1.1.1.1");
  });

  it("enforces and resets limits by window", () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(1000);

    const config = { windowMs: 100, maxRequests: 1 };
    const first = checkRateLimit("window-key", config);
    const second = checkRateLimit("window-key", config);

    nowSpy.mockReturnValue(1201);
    const third = checkRateLimit("window-key", config);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(third.allowed).toBe(true);
    nowSpy.mockRestore();
  });

  it("returns 429 after hitting limit", async () => {
    const limitedHandler = withRateLimit(
      { windowMs: 60_000, maxRequests: 1 },
      async () => NextResponse.json({ ok: true }, { status: 200 }),
    );

    const firstReq = makeRequest({
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    const secondReq = makeRequest({
      headers: { "x-forwarded-for": "9.9.9.9" },
    });

    const first = await limitedHandler(firstReq, undefined);
    const second = await limitedHandler(secondReq, undefined);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });
});

describe("error and validation middleware", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates standardized error responses", async () => {
    const response = createErrorResponse(
      "BAD_REQUEST",
      "Bad request",
      400,
      { field: "name" },
      "req-1",
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe("req-1");
    expect(payload.status).toBe(400);
    expect(payload.requestId).toBe("req-1");
  });

  it("maps zod errors through handleApiError", async () => {
    const schema = z.object({ name: z.string() });
    const parsed = schema.safeParse({});
    if (parsed.success) {
      throw new Error("Expected parse failure");
    }

    const response = handleApiError(parsed.error, "req-zod");
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation error response from validateRequest", async () => {
    const validator = validateRequest(z.object({ name: z.string() }));
    const response = await validator(
      makeRequest({
        method: "POST",
        body: { name: 123 as unknown as string },
        headers: { "x-request-id": "req-validate" },
      }),
    );

    expect(response).toBeInstanceOf(Response);
    const payload = await (response as Response).json();
    expect((response as Response).status).toBe(400);
    expect(payload.requestId).toBe("req-validate");
  });

  it("passes parsed data into withValidation handler", async () => {
    const handler = withValidation(
      z.object({ name: z.string() }),
      async (data) => NextResponse.json({ ok: data.name }),
    );

    const response = await handler(
      makeRequest({ method: "POST", body: { name: "valid" } }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe("valid");
  });
});
