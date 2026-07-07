import { SearchHistoryWriter } from "@/core/trading/search-history.writer";
import { Offer, SearchRequest } from "@/models";
import { generateId } from "@/shared/id";
import { prisma } from "@/database/prisma-client";

export class SearchHistoryRepository implements SearchHistoryWriter {
  async record(requestId: string, request: SearchRequest, offers: Offer[], durationMs: number): Promise<void> {
    await prisma.searchHistory.create({
      data: {
        id: generateId("searchhist"),
        requestId,
        product: request.product,
        country: request.country,
        currency: request.currency,
        faceValue: request.faceValue,
        quantity: request.quantity,
        offerCount: offers.length,
        durationMs,
        offersJson: JSON.stringify(offers),
      },
    });
  }

  async list(limit = 50) {
    return prisma.searchHistory.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }
}
