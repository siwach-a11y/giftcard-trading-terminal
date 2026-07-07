import { NextRequest, NextResponse } from "next/server";
import { container } from "@/config/container";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    container.executionEngine.resumeManualAuth(params.id);
    return NextResponse.json({ resumed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 404 });
  }
}
