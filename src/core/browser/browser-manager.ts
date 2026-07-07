import fs from "node:fs";
import path from "node:path";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { getConfig } from "@/config/config";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Thin wrapper around Playwright's launch/context lifecycle so every
 * connector gets the same headless/timeout/screenshot behavior from
 * `config/default.yaml` without repeating it. Vendor-specific navigation
 * logic never lives here — that belongs entirely to a concrete connector.
 */
export class BrowserManager {
  async launchBrowser(): Promise<Browser> {
    const { headless } = getConfig().browser;
    return chromium.launch({ headless });
  }

  async createContext(browser: Browser): Promise<BrowserContext> {
    const { timeout } = getConfig().browser;
    const context = await browser.newContext();
    context.setDefaultTimeout(timeout);
    context.setDefaultNavigationTimeout(timeout);
    return context;
  }

  async open(): Promise<BrowserSession> {
    const browser = await this.launchBrowser();
    const context = await this.createContext(browser);
    const page = await context.newPage();
    return { browser, context, page };
  }

  async waitForNetworkIdle(page: Page): Promise<void> {
    const { timeout } = getConfig().browser;
    await page.waitForLoadState("networkidle", { timeout });
  }

  async takeScreenshot(page: Page, reason: string): Promise<string> {
    const { screenshotDir } = getConfig().browser;
    const dir = path.resolve(process.cwd(), screenshotDir);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${Date.now()}-${reason.replace(/[^a-z0-9-_]+/gi, "_")}.png`;
    const filePath = path.join(dir, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  async close(session: BrowserSession): Promise<void> {
    await session.context.close().catch(() => undefined);
    await session.browser.close().catch(() => undefined);
  }
}
