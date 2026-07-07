import { NextRequest, NextResponse } from "next/server";
import { container } from "@/config/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = container.executionEngine.getExecution(params.id);
  if (!result) {
    return NextResponse.json({ error: `No execution found for id "${params.id}"` }, { status: 404 });
  }
  return NextResponse.json({ result });
}
