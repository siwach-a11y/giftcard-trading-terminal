import { Voucher } from "./voucher.model";

export type PurchaseStatus = "success" | "failed" | "manual_auth_required" | "timeout";

export interface PurchaseResult {
  status: PurchaseStatus;
  voucher?: Voucher;
  message?: string;
  screenshots: string[];
  durationMs: number;
}
