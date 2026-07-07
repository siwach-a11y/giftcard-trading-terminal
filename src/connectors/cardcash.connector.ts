import { Page } from "playwright";
import { PlaywrightConnector } from "./base/playwright.connector";
import {
  HealthStatus,
  PurchaseRequest,
  PurchaseResult,
  SearchRequest,
  SearchResult,
  VerificationRequest,
} from "@/models";
import { ManualAuthHandler } from "@/shared/manual-auth";

const BASE_URL = "https://www.cardcash.com";

/**
 * Connector for cardcash.com, a real US-focused marketplace specifically
 * for buying/selling discounted gift cards.
 *
 * Intentionally an empty shell beyond `performHealthCheck`: cardcash.com
 * sits behind a Cloudflare JS bot-challenge ("Just a moment...") that
 * returned a 403 to a plain inspection request during development.
 * Bypassing bot-detection is out of scope for this project, so the
 * search/login/checkout DOM was never inspected and none of it is
 * implemented here — per this project's rule, an unverified vendor gets an
 * empty connector, not guessed selectors.
 *
 * To complete this connector: open cardcash.com in a real, logged-in
 * browser yourself, run `npx playwright codegen https://www.cardcash.com`,
 * record the search/login/purchase flow, and replace the `throw`s below
 * with the recorded steps.
 */
export class CardCashConnector extends PlaywrightConnector {
  readonly id = "cardcash";
  readonly name = "CardCash";

  protected async performSearch(_page: Page, _request: SearchRequest): Promise<SearchResult[]> {
    throw new Error(
      "CardCashConnector.performSearch is not implemented — see the class-level comment in cardcash.connector.ts."
    );
  }

  protected async performLogin(_page: Page): Promise<void> {
    throw new Error(
      "CardCashConnector.performLogin is not implemented — see the class-level comment in cardcash.connector.ts."
    );
  }

  protected async performPurchase(
    _page: Page,
    _request: PurchaseRequest,
    _onManualAuthRequired: ManualAuthHandler
  ): Promise<PurchaseResult> {
    throw new Error(
      "CardCashConnector.performPurchase is not implemented — see the class-level comment in cardcash.connector.ts."
    );
  }

  protected async performVerify(_page: Page, _request: VerificationRequest): Promise<boolean> {
    throw new Error(
      "CardCashConnector.performVerify is not implemented — see the class-level comment in cardcash.connector.ts."
    );
  }

  protected async performHealthCheck(): Promise<HealthStatus> {
    const session = await this.browserManager.open();
    try {
      const response = await session.page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      const ok = !!response && response.ok();
      return {
        state: ok ? "healthy" : "degraded",
        message: ok ? undefined : `Unexpected status ${response?.status()} (site may be behind bot-detection)`,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      await this.browserManager.close(session);
    }
  }
}
