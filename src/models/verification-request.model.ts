import { Voucher } from "./voucher.model";

/**
 * Request to verify that a previously extracted voucher is genuinely
 * redeemable against the source connector (balance check, etc.).
 */
export interface VerificationRequest {
  voucher: Voucher;
  reference: string;
}
