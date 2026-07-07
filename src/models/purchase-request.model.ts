import { Offer } from "./offer.model";
import { ManualAuthHandler } from "@/shared/manual-auth";

/**
 * Instruction to a connector to execute a purchase against a specific offer
 * it previously returned from `search()`.
 */
export interface PurchaseRequest {
  offer: Offer;
  quantity: number;
  /**
   * Supplied by the Execution Engine so a connector can pause on manual
   * authentication and have the engine own the actual wait/resume state.
   * Falls back to a connector-local no-op handler when omitted.
   */
  onManualAuthRequired?: ManualAuthHandler;
}
