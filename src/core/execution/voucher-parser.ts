import { Voucher } from "@/models";

const CODE_LABEL_PATTERN = /(?:code|voucher code|gift card code|redemption code)\s*[:\-]?\s*([A-Z0-9-]{6,32})/i;
const BARE_CODE_PATTERN = /\b([A-Z0-9]{4,8}(?:-[A-Z0-9]{4,8}){1,4})\b/;
const PIN_PATTERN = /\bpin\s*[:\-]?\s*(\d{3,8})\b/i;
const EXPIRY_PATTERN =
  /(?:expiry|expires?|valid until|exp)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i;
const FACE_VALUE_PATTERN = /\b([A-Z]{3})\s?(\d+(?:\.\d{1,2})?)\b/;

/**
 * Generic, vendor-agnostic extraction of a voucher payload from raw text a
 * connector scraped off a confirmation/receipt page. Deliberately has no
 * knowledge of any specific website's DOM — connectors are responsible for
 * getting plain text (or an image, out of scope here) to these methods.
 */
export class VoucherParser {
  extractCode(rawText: string): string | undefined {
    const labeled = rawText.match(CODE_LABEL_PATTERN);
    if (labeled?.[1]) return labeled[1].trim();
    const bare = rawText.match(BARE_CODE_PATTERN);
    return bare?.[1]?.trim();
  }

  extractPin(rawText: string): string | undefined {
    return rawText.match(PIN_PATTERN)?.[1];
  }

  extractExpiry(rawText: string): string | undefined {
    return rawText.match(EXPIRY_PATTERN)?.[1];
  }

  extractFaceValue(rawText: string): { currency: string; amount: number } | undefined {
    const match = rawText.match(FACE_VALUE_PATTERN);
    if (!match || !match[1] || !match[2]) return undefined;
    return { currency: match[1], amount: Number(match[2]) };
  }

  parse(rawText: string): Voucher | null {
    const code = this.extractCode(rawText);
    if (!code) return null;

    const faceValue = this.extractFaceValue(rawText);
    return {
      code,
      pin: this.extractPin(rawText),
      expiry: this.extractExpiry(rawText),
      faceValue: faceValue?.amount,
      currency: faceValue?.currency,
      raw: rawText,
    };
  }

  validate(voucher: Voucher): boolean {
    if (!voucher.code || voucher.code.length < 4) return false;
    if (voucher.expiry) {
      const expiryDate = new Date(voucher.expiry);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
        return false;
      }
    }
    return true;
  }
}
