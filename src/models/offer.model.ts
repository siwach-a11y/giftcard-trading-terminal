/**
 * Normalized, comparable offer produced by the Trading Engine from a
 * connector's {@link SearchResult}. This is the unit the Smart Order Router
 * scores and ranks.
 */
export interface Offer {
  id: string;
  connectorId: string;
  product: string;
  country: string;
  currency: string;
  price: number;
  available: boolean;
  deliveryTime: string;
  /** Milliseconds the connector took to produce this result. */
  searchDuration: number;
  timestamp: string;
  /** Opaque, connector-defined pointer to the exact listing, passed back on purchase. */
  reference: string;
}
