import { NextResponse } from "next/server";
import { z } from "zod";

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
  status: number;
}

export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: Record<string, unknown>,
  requestId?: string,
): NextResponse<ApiErrorResponse> {
  const resolvedRequestId = requestId || crypto.randomUUID();
  const response: ApiErrorResponse = {
    code,
    message,
    timestamp: new Date().toISOString(),
    requestId: resolvedRequestId,
    status: statusCode,
  };

  if (details) {
    response.details = details;
  }

  console.error(`[${code}] ${message}`, {
    requestId: resolvedRequestId,
    ...details,
  });

  return NextResponse.json(response, {
    status: statusCode,
    headers: { "x-request-id": resolvedRequestId },
  });
}

export function handleApiError(
  error: unknown,
  requestId?: string,
): NextResponse<ApiErrorResponse> {
  if (error instanceof z.ZodError) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Request validation failed",
      400,
      error.flatten(),
      requestId,
    );
  }

  if (error instanceof SyntaxError) {
    return createErrorResponse(
      "PARSE_ERROR",
      "Invalid JSON in request body",
      400,
      undefined,
      requestId,
    );
  }

  if (error instanceof Error) {
    if (error.message.includes("ENOENT")) {
      return createErrorResponse(
        "NOT_FOUND",
        "Resource not found",
        404,
        undefined,
        requestId,
      );
    }

    if (error.message.includes("Prisma")) {
      return createErrorResponse(
        "DATABASE_ERROR",
        "Database operation failed",
        500,
        { message: error.message },
        requestId,
      );
    }
  }

  return createErrorResponse(
    "INTERNAL_ERROR",
    "Internal server error",
    500,
    { message: error instanceof Error ? error.message : "Unknown error" },
    requestId,
  );
}
