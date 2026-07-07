import { RoutingDecision } from "@/models";
import { generateId } from "@/shared/id";
import { prisma } from "@/database/prisma-client";

export class RoutingHistoryRepository {
  async record(decision: RoutingDecision): Promise<void> {
    await prisma.routingHistory.create({
      data: {
        id: generateId("routehist"),
        bestOfferId: decision.bestOffer?.id,
        bestConnectorId: decision.bestOffer?.connectorId,
        explanation: decision.explanation,
        rankedJson: JSON.stringify(decision.ranked),
      },
    });
  }

  async list(limit = 50) {
    return prisma.routingHistory.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }
}
