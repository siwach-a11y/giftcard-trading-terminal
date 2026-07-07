import { Offer } from "./offer.model";

export interface ScoreBreakdown {
  offerId: string;
  connectorId: string;
  priceScore: number;
  availabilityScore: number;
  speedScore: number;
  reliabilityScore: number;
  riskScore: number;
  finalScore: number;
}

/**
 * Full output of a single Smart Order Router pass: every offer ranked with
 * its score breakdown, the selected best offer, and a human-readable
 * explanation of why it won.
 */
export interface RoutingDecision {
  ranked: ScoreBreakdown[];
  bestOffer: Offer | null;
  explanation: string;
  timestamp: string;
}
