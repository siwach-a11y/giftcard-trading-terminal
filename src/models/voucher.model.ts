/**
 * Extracted gift-card / voucher payload. `pin` is optional since many
 * digital codes ship without one.
 */
export interface Voucher {
  code: string;
  pin?: string;
  expiry?: string;
  faceValue?: number;
  currency?: string;
  raw: string;
}
