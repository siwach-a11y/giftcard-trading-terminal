import { Offer } from "./offer.model";
import { PurchaseResult } from "./purchase-result.model";

export type ExecutionStatus =
  | "pending"
  | "running"
  | "awaiting_manual_auth"
  | "completed"
  | "failed"
  | "timed_out"
  | "retrying";

export interface ExecutionResult {
  id: string;
  offer: Offer;
  status: ExecutionStatus;
  attempt: number;
  maxAttempts: number;
  purchaseResult?: PurchaseResult;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}
