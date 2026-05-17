import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { ApiKeyCreateSchema } from "@/lib/types";
import { withRateLimit } from "@/lib/middleware/rateLimit";
import { withCsrfProtection } from "@/lib/middleware/csrf";
import { withValidation } from "@/lib/middleware/validation";
import { handleApiError } from "@/lib/middleware/errorHandler";

type ApiKeyRow = {
  id: string;
  provider: string;
  label: string;
  encryptedKey: string;
  createdAt: Date;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getHandler = async (_request: NextRequest) => {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Mask the keys for display
    const masked = keys.map((k: ApiKeyRow) => ({
      id: k.id,
      provider: k.provider,
      label: k.label,
      maskedKey: "••••" + k.encryptedKey.slice(-4),
      createdAt: k.createdAt,
    }));

    return NextResponse.json(masked);
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRateLimit(
  { windowMs: 60000, maxRequests: 100 },
  getHandler
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const postHandler = withValidation(ApiKeyCreateSchema, async (data, _req) => {
  try {
    const encryptedKey = encrypt(data.key);

    const apiKey = await prisma.apiKey.create({
      data: {
        provider: data.provider,
        label: data.label || data.provider,
        encryptedKey
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        provider: apiKey.provider,
        label: apiKey.label,
        maskedKey: "••••" + data.key.slice(-4),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withRateLimit(
  { windowMs: 60000, maxRequests: 100 },
  withCsrfProtection(postHandler)
);
