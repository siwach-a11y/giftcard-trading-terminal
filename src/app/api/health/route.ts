import { NextResponse } from "next/server";
import { container } from "@/config/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const connectors = container.connectorRegistry.list();
  const statuses = await Promise.all(
    connectors.map(async (connector) => {
      const status = await connector.health();
      await container.connectorHealthRepository.record(connector.id, status);
      return { connectorId: connector.id, name: connector.name, enabled: connector.enabled, status };
    })
  );
  return NextResponse.json({ connectors: statuses });
}
