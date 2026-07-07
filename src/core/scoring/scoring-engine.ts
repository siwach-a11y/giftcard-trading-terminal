import { Offer, ScoreBreakdown } from "@/models";
import { ScoringWeights } from "@/config/config.schema";
import { ConnectorSignals } from "./connector-signals.provider";

export interface ScoringContext {
  lowestPrice: number;
  maxSearchTimeMs: number;
  weights: ScoringWeights;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Pure scoring math, deliberately free of any I/O so it can be unit tested
 * with plain fixtures. Implements:
 *
 *   FinalScore =
 *     PriceWeight        * PriceScore
 *   + AvailabilityWeight * AvailabilityScore
 *   + SpeedWeight        * SpeedScore
 *   + ReliabilityWeight  * ReliabilityScore
 *   - RiskWeight         * RiskScore
 */
export class ScoringEngine {
  calculateScore(offer: Offer, signals: ConnectorSignals, context: ScoringContext): ScoreBreakdown {
    const priceScore = offer.price > 0 ? clamp01(context.lowestPrice / offer.price) : 0;
    const availabilityScore = offer.available ? 1 : 0;
    const speedScore = clamp01(1 - offer.searchDuration / context.maxSearchTimeMs);
    const reliabilityScore = clamp01(signals.reliability);
    const riskScore = clamp01(signals.risk);

    const { weights } = context;
    const finalScore =
      weights.price * priceScore +
      weights.availability * availabilityScore +
      weights.speed * speedScore +
      weights.reliability * reliabilityScore -
      weights.risk * riskScore;

    return {
      offerId: offer.id,
      connectorId: offer.connectorId,
      priceScore,
      availabilityScore,
      speedScore,
      reliabilityScore,
      riskScore,
      finalScore,
    };
  }
}
