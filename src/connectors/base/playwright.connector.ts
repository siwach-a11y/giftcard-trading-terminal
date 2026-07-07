import { Page } from "playwright";
import { getConfig } from "@/config/config";
import { BrowserManager, BrowserSession } from "@/core/browser/browser-manager";
import { eventBus } from "@/core/events/event-bus";
import {
  HealthStatus,
  PurchaseRequest,
  PurchaseResult,
  SearchRequest,
  SearchResult,
  VerificationRequest,
} from "@/models";
import { ManualAuthHandler } from "@/shared/manual-auth";
import { Connector } from "./connector.interface";

/**
 * Base class for any connector that automates a real website via
 * Playwright. It owns everything vendor-agnostic — browser lifecycle,
 * retries, screenshots-on-error, event emission — and delegates every
 * vendor-specific step (`performLogin`, `performSearch`, `performPurchase`,
 * `performVerify`, `performHealthCheck`) to a subclass.
 *
 * This class is intentionally never instantiated directly, and this
 * repository ships no subclasses of it — see `src/connectors/README.md`.
 */
export abstract class PlaywrightConnector implements Connector {
  abstract readonly id: string;
  abstract readonly name: string;
  enabled = true;

  protected readonly browserManager = new BrowserManager();

  // ---- Reusable infrastructure, shared by every connector ----------------

  protected async launchBrowser(): ReturnType<BrowserManager["launchBrowser"]> {
    return this.browserManager.launchBrowser();
  }

  protected async createContext(
    browser: Awaited<ReturnType<BrowserManager["launchBrowser"]>>
  ): ReturnType<BrowserManager["createContext"]> {
    return this.browserManager.createContext(browser);
  }

  protected async waitForNetwork(page: Page): Promise<void> {
    await this.browserManager.waitForNetworkIdle(page);
  }

  protected async takeScreenshot(page: Page, reason: string): Promise<string> {
    const filePath = await this.browserManager.takeScreenshot(page, reason);
    eventBus.emit("screenshot.captured", { executionId: this.id, path: filePath, reason });
    return filePath;
  }

  protected async close(session: BrowserSession): Promise<void> {
    await this.browserManager.close(session);
  }

  protected async retry<T>(fn: (attempt: number) => Promise<T>, label: string): Promise<T> {
    const { retries } = getConfig().browser;
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        eventBus.emit("error.captured", {
          scope: `connector.${this.id}.${label}`,
          error: error instanceof Error ? error.message : String(error),
          cause: error,
        });
        if (attempt <= retries) continue;
      }
    }
    throw lastError;
  }

  protected async captureErrors<T>(scope: string, page: Page | undefined, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (page && getConfig().browser.screenshotOnError) {
        await this.takeScreenshot(page, `error-${scope}`).catch(() => undefined);
      }
      eventBus.emit("error.captured", { scope: `connector.${this.id}.${scope}`, error: message, cause: error });
      throw error;
    }
  }

  protected async login(page: Page): Promise<void> {
    await this.captureErrors("login", page, () => this.retry(() => this.performLogin(page), "login"));
  }

  // ---- Connector contract, orchestrating the abstract vendor steps -------

  async search(request: SearchRequest): Promise<SearchResult[]> {
    const session = await this.browserManager.open();
    try {
      return await this.captureErrors("search", session.page, () =>
        this.retry((attempt) => this.performSearch(session.page, request, attempt), "search")
      );
    } finally {
      await this.close(session);
    }
  }

  async purchase(request: PurchaseRequest): Promise<PurchaseResult> {
    const session = await this.browserManager.open();
    const startedAt = Date.now();
    try {
      const handler = request.onManualAuthRequired ?? this.onManualAuthRequired.bind(this);
      const result = await this.captureErrors("purchase", session.page, () =>
        this.performPurchase(session.page, request, handler)
      );
      return { ...result, durationMs: Date.now() - startedAt };
    } finally {
      await this.close(session);
    }
  }

  async verify(request: VerificationRequest): Promise<boolean> {
    const session = await this.browserManager.open();
    try {
      return await this.captureErrors("verify", session.page, () => this.performVerify(session.page, request));
    } finally {
      await this.close(session);
    }
  }

  async health(): Promise<HealthStatus> {
    const startedAt = Date.now();
    try {
      const status = await this.performHealthCheck();
      const withLatency = { ...status, latencyMs: Date.now() - startedAt };
      eventBus.emit("connector.health.checked", { connectorId: this.id, status: withLatency });
      return withLatency;
    } catch (error) {
      const status: HealthStatus = {
        state: "down",
        message: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      };
      eventBus.emit("connector.health.checked", { connectorId: this.id, status });
      return status;
    }
  }

  private async onManualAuthRequired(message: string): Promise<void> {
    eventBus.emit("execution.manual_auth_required", { executionId: this.id, message });
  }

  // ---- Vendor-specific steps, implemented only by a real connector -------

  protected abstract performLogin(page: Page): Promise<void>;
  protected abstract performSearch(page: Page, request: SearchRequest, attempt: number): Promise<SearchResult[]>;
  protected abstract performPurchase(
    page: Page,
    request: PurchaseRequest,
    onManualAuthRequired: ManualAuthHandler
  ): Promise<PurchaseResult>;
  protected abstract performVerify(page: Page, request: VerificationRequest): Promise<boolean>;
  protected abstract performHealthCheck(): Promise<HealthStatus>;
}
