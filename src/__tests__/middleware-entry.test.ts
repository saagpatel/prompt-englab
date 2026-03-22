/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { securityHeaders } from "@/lib/middleware/security";

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/prompts", {
    headers: headers || {},
  });
}

describe("app middleware entry", () => {
  it("applies security headers and request id", () => {
    const req = makeRequest({ "x-request-id": "existing-id" });
    const response = middleware(req);

    Object.entries(securityHeaders).forEach(([key, value]) => {
      expect(response.headers.get(key)).toBe(value);
    });
    expect(response.headers.get("x-request-id")).toBe("existing-id");
  });

  it("sets csrf cookie when missing", () => {
    const req = makeRequest();
    const response = middleware(req);
    const csrfCookie = response.cookies.get("csrf-token");

    expect(csrfCookie).toBeDefined();
    expect(csrfCookie?.value).toMatch(/^[0-9a-f]+$/);
  });
});
