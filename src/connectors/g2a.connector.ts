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

const BASE_URL = "https://www.g2a.com";

/**
 * Connector for g2a.com, a real global marketplace for game keys and
 * gift cards.
 *
 * Intentionally an empty shell beyond `performHealthCheck`: g2a.com sits
 * behind Akamai's bot-management edge, which returned a hard "Access
 * Denied" to a plain inspection request during development. Bypassing
 * bot-detection is out of scope for this project, so the search/login/
 * checkout DOM was never inspected and none of it is implemented here —
 * per this project's rule, an unverified vendor gets an empty connector,
 * not guessed selectors.
 *
 * To complete this connector: open g2a.com in a real, logged-in browser
 * yourself, run `npx playwright codegen https://www.g2a.com`, record the
 * search/login/purchase flow, and replace the `throw`s below with the
 * recorded steps.
 */
export class G2AConnector extends PlaywrightConnector {
  readonly id = "g2a";
  readonly name = "G2A";

  protected async performSearch(_page: Page, _request: SearchRequest): Promise<SearchResult[]> {
    throw new Error("G2AConnector.performSearch is not implemented — see the class-level comment in g2a.connector.ts.");
  }

  protected async performLogin(_page: Page): Promise<void> {
    throw new Error("G2AConnector.performLogin is not implemented — see the class-level comment in g2a.connector.ts.");
  }

  protected async performPurchase(
    _page: Page,
    _request: PurchaseRequest,
    _onManualAuthRequired: ManualAuthHandler
  ): Promise<PurchaseResult> {
    throw new Error("G2AConnector.performPurchase is not implemented — see the class-level comment in g2a.connector.ts.");
  }

  protected async performVerify(_page: Page, _request: VerificationRequest): Promise<boolean> {
    throw new Error("G2AConnector.performVerify is not implemented — see the class-level comment in g2a.connector.ts.");
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
