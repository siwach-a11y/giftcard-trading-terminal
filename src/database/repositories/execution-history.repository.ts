import { ExecutionHistoryWriter } from "@/core/execution/execution-history.writer";
import { ExecutionResult } from "@/models";
import { generateId } from "@/shared/id";
import { prisma } from "@/database/prisma-client";

export class ExecutionHistoryRepository implements ExecutionHistoryWriter {
  async record(result: ExecutionResult): Promise<void> {
    await prisma.executionHistory.upsert({
      where: { executionId: result.id },
      create: {
        id: generateId("exechist"),
        executionId: result.id,
        connectorId: result.offer.connectorId,
        offerId: result.offer.id,
        offerJson: JSON.stringify(result.offer),
        status: result.status,
        attempt: result.attempt,
        maxAttempts: result.maxAttempts,
        purchaseStatus: result.purchaseResult?.status,
        voucherCode: result.purchaseResult?.voucher?.code,
        error: result.error,
        startedAt: new Date(result.startedAt),
        finishedAt: result.finishedAt ? new Date(result.finishedAt) : undefined,
      },
      update: {
        status: result.status,
        attempt: result.attempt,
        purchaseStatus: result.purchaseResult?.status,
        voucherCode: result.purchaseResult?.voucher?.code,
        error: result.error,
        finishedAt: result.finishedAt ? new Date(result.finishedAt) : undefined,
      },
    });
  }

  async list(limit = 50) {
    return prisma.executionHistory.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }

  async successRate(connectorId: string): Promise<{ successful: number; total: number }> {
    const [total, successful] = await Promise.all([
      prisma.executionHistory.count({ where: { connectorId, status: { in: ["completed", "failed"] } } }),
      prisma.executionHistory.count({ where: { connectorId, purchaseStatus: "success" } }),
    ]);
    return { successful, total };
  }
}
