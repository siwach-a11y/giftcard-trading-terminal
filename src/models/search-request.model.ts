/**
 * Operator-issued search query, e.g. "Steam USD20". Connectors interpret
 * `product`/`country`/`currency`/`faceValue` however their target website
 * expects — the Trading Engine does not assume a shared vocabulary.
 */
export interface SearchRequest {
  product: string;
  country?: string;
  currency?: string;
  faceValue?: number;
  quantity?: number;
}
