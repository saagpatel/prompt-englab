import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/middleware/rateLimit";
import { handleApiError } from "@/lib/middleware/errorHandler";

type ExportPromptRow = {
  title: string;
  content: string;
  systemPrompt: string | null;
  category: string | null;
  notes: string | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: { tag: string }[];
  versions: {
    content: string;
    systemPrompt: string | null;
    versionNumber: number;
    changeNote: string | null;
    createdAt: Date;
  }[];
  responses: {
    modelName: string;
    content: string;
    tokenCount: number | null;
    executionTime: number | null;
    source: string;
    rating: number | null;
    notes: string | null;
    createdAt: Date;
  }[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getHandler = async (_request: NextRequest) => {
  try {
  const prompts = await prisma.prompt.findMany({
    include: {
      tags: true,
      versions: { orderBy: { versionNumber: "asc" } },
      responses: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: 1,
    prompts: prompts.map((p: ExportPromptRow) => ({
      title: p.title,
      content: p.content,
      systemPrompt: p.systemPrompt,
      category: p.category,
      notes: p.notes,
      isFavorite: p.isFavorite,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tags: p.tags.map((t: { tag: string }) => t.tag),
      versions: p.versions.map((v: ExportPromptRow["versions"][number]) => ({
        content: v.content,
        systemPrompt: v.systemPrompt,
        versionNumber: v.versionNumber,
        changeNote: v.changeNote,
        createdAt: v.createdAt,
      })),
      responses: p.responses.map((r: ExportPromptRow["responses"][number]) => ({
        modelName: r.modelName,
        content: r.content,
        tokenCount: r.tokenCount,
        executionTime: r.executionTime,
        source: r.source,
        rating: r.rating,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    })),
  };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="prompt-lab-export.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRateLimit(
  { windowMs: 60000, maxRequests: 100 },
  getHandler
);
