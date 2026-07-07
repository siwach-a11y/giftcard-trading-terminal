import { NextResponse } from "next/server";
import { container } from "@/config/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const history = await container.routingHistoryRepository.list();
  return NextResponse.json({ history });
}
