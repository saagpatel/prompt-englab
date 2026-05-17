import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/middleware/rateLimit";
import { handleApiError } from "@/lib/middleware/errorHandler";

type CostByModelRow = {
  modelName: string;
  _sum: { costEstimate: number | null };
};

type PromptCategoryRow = {
  category: string | null;
  _count: { id: number };
};

type ResponseModelRow = {
  modelName: string;
  _count: { id: number };
};

type RatingByModelRow = {
  modelName: string;
  _avg: { rating: number | null };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getHandler = async (_request: NextRequest) => {
  try {
  const [
    totalPrompts,
    totalResponses,
    totalVersions,
    promptsByCategory,
    responsesByModel,
    avgRatingByModel,
    promptsOverTime,
    totalCostAgg,
    costByModelAgg,
  ] = await Promise.all([
    prisma.prompt.count(),
    prisma.response.count(),
    prisma.promptVersion.count(),
    prisma.prompt.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.response.groupBy({
      by: ["modelName"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.response.groupBy({
      by: ["modelName"],
      _avg: { rating: true },
      where: { rating: { not: null } },
    }),
    prisma.prompt.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.response.aggregate({
      _sum: { costEstimate: true },
    }),
    prisma.response.groupBy({
      by: ["modelName"],
      _sum: { costEstimate: true },
      orderBy: { _sum: { costEstimate: "desc" } },
    }),
  ]);

  // Aggregate prompts by date
  const dateMap = new Map<string, number>();
  for (const p of promptsOverTime) {
    const date = new Date(p.createdAt).toISOString().slice(0, 10);
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  }
  const promptsByDate = Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totals: {
      prompts: totalPrompts,
      responses: totalResponses,
      versions: totalVersions,
    },
    totalCost: totalCostAgg._sum.costEstimate || 0,
    costByModel: costByModelAgg.map((r: CostByModelRow) => ({
      model: r.modelName,
      cost: Number((r._sum.costEstimate || 0).toFixed(4)),
    })),
    promptsByCategory: promptsByCategory.map((c: PromptCategoryRow) => ({
      category: c.category || "Uncategorized",
      count: c._count.id,
    })),
    responsesByModel: responsesByModel.map((r: ResponseModelRow) => ({
      model: r.modelName,
      count: r._count.id,
    })),
    avgRatingByModel: avgRatingByModel.map((r: RatingByModelRow) => ({
      model: r.modelName,
      avgRating: Number((r._avg.rating || 0).toFixed(2)),
    })),
    promptsByDate,
  });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withRateLimit(
  { windowMs: 60000, maxRequests: 100 },
  getHandler
);
