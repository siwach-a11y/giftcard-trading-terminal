import { HealthStatus } from "@/models";
import { prisma } from "@/database/prisma-client";

export class ConnectorHealthRepository {
  async record(connectorId: string, status: HealthStatus): Promise<void> {
    await prisma.connectorHealth.upsert({
      where: { connectorId },
      create: {
        connectorId,
        state: status.state,
        latencyMs: status.latencyMs,
        message: status.message,
        checkedAt: new Date(status.checkedAt || Date.now()),
      },
      update: {
        state: status.state,
        latencyMs: status.latencyMs,
        message: status.message,
        checkedAt: new Date(),
      },
    });
  }

  async list() {
    return prisma.connectorHealth.findMany();
  }
}
