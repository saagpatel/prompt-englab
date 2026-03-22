import { z } from "zod";
import { NextRequest } from "next/server";
import { createErrorResponse } from "@/lib/middleware/errorHandler";

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          "Invalid request body",
          400,
          error.flatten(),
          req.headers.get("x-request-id") || undefined,
        );
      }
      throw error;
    }
  };
}

export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, req: NextRequest) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const data = schema.parse(body);
      return await handler(data, req);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          "Invalid request body",
          400,
          error.flatten(),
          req.headers.get("x-request-id") || undefined,
        );
      }
      throw error;
    }
  };
}
