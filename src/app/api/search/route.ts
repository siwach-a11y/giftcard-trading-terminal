import { NextRequest, NextResponse } from "next/server";
import { container } from "@/config/container";
import { SearchRequest } from "@/models";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SearchRequest>;

  if (!body.product || typeof body.product !== "string") {
    return NextResponse.json({ error: "`product` is required" }, { status: 400 });
  }

  const request: SearchRequest = {
    product: body.product,
    country: body.country,
    currency: body.currency,
    faceValue: body.faceValue,
    quantity: body.quantity,
  };

  const offers = await container.tradingEngine.searchAll(request);
  const decision = await container.smartOrderRouter.decide(offers);
  await container.routingHistoryRepository.record(decision);

  return NextResponse.json({ offers, ranking: decision.ranked, bestOffer: decision.bestOffer, explanation: decision.explanation });
}
