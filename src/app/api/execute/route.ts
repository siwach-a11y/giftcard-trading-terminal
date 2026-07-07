import { NextRequest, NextResponse } from "next/server";
import { container } from "@/config/container";
import { Offer } from "@/models";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { offer?: Offer; quantity?: number };

  if (!body.offer) {
    return NextResponse.json({ error: "`offer` is required" }, { status: 400 });
  }

  try {
    const result = await container.executionEngine.execute(body.offer, body.quantity ?? 1);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
