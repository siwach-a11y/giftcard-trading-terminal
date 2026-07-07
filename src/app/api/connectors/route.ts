import { NextResponse } from "next/server";
import { container } from "@/config/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const connectors = container.connectorRegistry.list().map((c) => ({ id: c.id, name: c.name, enabled: c.enabled }));
  return NextResponse.json({ connectors });
}
