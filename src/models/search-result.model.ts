/**
 * Raw result returned by a single connector's `search()` call, before the
 * Trading Engine normalizes it into an {@link Offer}.
 */
export interface SearchResult {
  product: string;
  country: string;
  currency: string;
  price: number;
  available: boolean;
  deliveryTime: string;
  /** Opaque, connector-defined pointer to the exact listing (URL, SKU, DOM path, etc.). */
  reference: string;
}
