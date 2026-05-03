import { type NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/middleware/errorHandler";
import { withRateLimit } from "@/lib/middleware/rateLimit";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getHandler = async (_request: NextRequest) => {
  try {
    return NextResponse.json({
      models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRateLimit(
  { windowMs: 60000, maxRequests: 100 },
  getHandler,
);
