import { getConfig } from "@/config/config";
import { eventBus } from "@/core/events/event-bus";
import { ConnectorSignalsProvider } from "@/core/scoring/connector-signals.provider";
import { ScoringEngine } from "@/core/scoring/scoring-engine";
import { Offer, RoutingDecision, ScoreBreakdown } from "@/models";

/**
 * Ranks offers gathered by the Trading Engine and picks the best one. Never
 * selects purely on price — the weighted score always accounts for
 * availability, speed, historical reliability, and manually configured
 * risk. See `config/default.yaml` for the weights.
 */
export class SmartOrderRouter {
  constructor(
    private readonly scoringEngine: ScoringEngine,
    private readonly signalsProvider: ConnectorSignalsProvider
  ) {}

  async rank(offers: Offer[]): Promise<ScoreBreakdown[]> {
    if (offers.length === 0) return [];

    const { weights, scoring } = getConfig();
    const lowestPrice = Math.min(...offers.map((o) => o.price));

    const breakdowns = await Promise.all(
      offers.map(async (offer) => {
        const signals = await this.signalsProvider.getSignals(offer.connectorId);
        return this.scoringEngine.calculateScore(offer, signals, {
          lowestPrice,
          maxSearchTimeMs: scoring.maxSearchTimeMs,
          weights,
        });
      })
    );

    return breakdowns.sort((a, b) => b.finalScore - a.finalScore);
  }

  selectBest(offers: Offer[], ranked: ScoreBreakdown[]): Offer | null {
    const top = ranked[0];
    if (!top) return null;
    return offers.find((o) => o.id === top.offerId) ?? null;
  }

  explainDecision(ranked: ScoreBreakdown[], bestOffer: Offer | null): string {
    if (!bestOffer || !ranked[0]) {
      return "No offers were available to route.";
    }
    const top = ranked[0];
    const runnerUp = ranked[1];
    const margin = runnerUp ? (top.finalScore - runnerUp.finalScore).toFixed(3) : "n/a";
    return (
      `Selected connector "${bestOffer.connectorId}" for ${bestOffer.product} ` +
      `(score ${top.finalScore.toFixed(3)}, margin over runner-up: ${margin}). ` +
      `Breakdown — price: ${top.priceScore.toFixed(2)}, availability: ${top.availabilityScore}, ` +
      `speed: ${top.speedScore.toFixed(2)}, reliability: ${top.reliabilityScore.toFixed(2)}, ` +
      `risk: ${top.riskScore.toFixed(2)}.`
    );
  }

  /** Convenience entry point: ranks, selects, explains, and publishes the decision event. */
  async decide(offers: Offer[]): Promise<RoutingDecision> {
    const ranked = await this.rank(offers);
    const bestOffer = this.selectBest(offers, ranked);
    const explanation = this.explainDecision(ranked, bestOffer);
    const decision: RoutingDecision = {
      ranked,
      bestOffer,
      explanation,
      timestamp: new Date().toISOString(),
    };
    eventBus.emit("routing.decided", { decision });
    return decision;
  }
}
