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

const BASE_URL = "https://www.kinguin.net";

/**
 * Connector for kinguin.net, a real global marketplace for game keys and
 * digital gift cards.
 *
 * Intentionally an empty shell beyond `performHealthCheck`: kinguin.net
 * sits behind a Cloudflare JS bot-challenge ("Just a moment...") that
 * returned a 403 to a plain inspection request during development.
 * Bypassing bot-detection is out of scope for this project, so the
 * search/login/checkout DOM was never inspected and none of it is
 * implemented here — per this project's rule, an unverified vendor gets an
 * empty connector, not guessed selectors.
 *
 * To complete this connector: open kinguin.net in a real, logged-in
 * browser yourself, run `npx playwright codegen https://www.kinguin.net`,
 * record the search/login/purchase flow, and replace the `throw`s below
 * with the recorded steps.
 */
export class KinguinConnector extends PlaywrightConnector {
  readonly id = "kinguin";
  readonly name = "Kinguin";

  protected async performSearch(_page: Page, _request: SearchRequest): Promise<SearchResult[]> {
    throw new Error(
      "KinguinConnector.performSearch is not implemented — see the class-level comment in kinguin.connector.ts."
    );
  }

  protected async performLogin(_page: Page): Promise<void> {
    throw new Error(
      "KinguinConnector.performLogin is not implemented — see the class-level comment in kinguin.connector.ts."
    );
  }

  protected async performPurchase(
    _page: Page,
    _request: PurchaseRequest,
    _onManualAuthRequired: ManualAuthHandler
  ): Promise<PurchaseResult> {
    throw new Error(
      "KinguinConnector.performPurchase is not implemented — see the class-level comment in kinguin.connector.ts."
    );
  }

  protected async performVerify(_page: Page, _request: VerificationRequest): Promise<boolean> {
    throw new Error(
      "KinguinConnector.performVerify is not implemented — see the class-level comment in kinguin.connector.ts."
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
