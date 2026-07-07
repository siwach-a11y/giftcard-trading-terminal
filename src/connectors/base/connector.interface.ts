import {
  HealthStatus,
  PurchaseRequest,
  PurchaseResult,
  SearchRequest,
  SearchResult,
  VerificationRequest,
} from "@/models";

/**
 * Contract every gift-card/voucher website integration must satisfy. This
 * repository ships zero implementations of this interface — see
 * `src/connectors/README.md` for how an operator plugs in a real, specific
 * website they are personally authorized to automate.
 */
export interface Connector {
  id: string;
  name: string;
  enabled: boolean;

  search(request: SearchRequest): Promise<SearchResult[]>;
  purchase(request: PurchaseRequest): Promise<PurchaseResult>;
  verify(request: VerificationRequest): Promise<boolean>;
  health(): Promise<HealthStatus>;
}
