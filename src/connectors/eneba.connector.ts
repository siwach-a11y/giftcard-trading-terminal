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

const BASE_URL = "https://www.eneba.com";

/**
 * Shape of the objects Eneba's server-rendered `__APOLLO_STATE__` script tag
 * contains for a search results page. Verified by fetching a real search
 * page (`/search?text=steam`) and inspecting the actual JSON — not guessed.
 * Eneba is a normalized Apollo cache: `Product.cheapestAuction` is a
 * `{ __ref }` pointer into the same object, not an inline value.
 */
interface ApolloRef {
  __ref: string;
}

interface ApolloProduct {
  __typename: "Product";
  name: string;
  slug: string;
  regions?: Array<{ name: string }>;
  cheapestAuction?: ApolloRef;
}

interface ApolloAuction {
  __typename: "Auction";
  isAddableToCart: boolean;
  isInStock: boolean;
  merchant?: { deliveryAuthorizationTerm?: { value?: string } };
  [priceKey: string]: unknown;
}

type ApolloState = Record<string, ApolloProduct | ApolloAuction | unknown>;

function isProduct(value: unknown): value is ApolloProduct {
  return typeof value === "object" && value !== null && (value as { __typename?: string }).__typename === "Product";
}

function isAuction(value: unknown): value is ApolloAuction {
  return typeof value === "object" && value !== null && (value as { __typename?: string }).__typename === "Auction";
}

/** Auction price fields are keyed like `price({"currency":"THB"})`. */
function pickPrice(auction: ApolloAuction, preferredCurrency?: string): { amount: number; currency: string } | undefined {
  const priceKeys = Object.keys(auction).filter((k) => k.startsWith("price("));
  const preferredKey = preferredCurrency && priceKeys.find((k) => k.includes(`"${preferredCurrency.toUpperCase()}"`));
  const key = preferredKey ?? priceKeys[0];
  if (!key) return undefined;
  const money = auction[key] as { amount?: number; currency?: string } | null;
  if (!money?.amount || !money.currency) return undefined;
  return { amount: money.amount / 100, currency: money.currency };
}

/**
 * Connector for eneba.com, a real global gift-card/game-key marketplace.
 *
 * `performSearch` is fully implemented against the site's actual
 * server-rendered Apollo GraphQL cache (verified live, not guessed).
 *
 * `performLogin` / `performPurchase` / `performVerify` are intentionally
 * left unimplemented: Eneba's login and checkout are client-rendered
 * (no `/login` route — it's a JS modal) and could not be inspected without
 * an authenticated browser session. Per this project's rule against
 * fabricating vendor-specific behavior, these throw instead of guessing
 * selectors. Complete them yourself with Playwright's codegen
 * (`npx playwright codegen https://www.eneba.com`) while logged into your
 * own account, then replace the `throw` with the recorded steps.
 */
export class EnebaConnector extends PlaywrightConnector {
  readonly id = "eneba";
  readonly name = "Eneba";

  private buildSearchUrl(request: SearchRequest): string {
    const url = new URL("/search", BASE_URL);
    url.searchParams.set("text", request.product);
    return url.toString();
  }

  protected async performSearch(page: Page, request: SearchRequest): Promise<SearchResult[]> {
    await page.goto(this.buildSearchUrl(request), { waitUntil: "domcontentloaded" });
    // Verified live: this page never reaches Playwright's "networkidle"
    // (continuous background analytics/telemetry requests), so waiting on
    // that timed out every run. The Apollo state script tag is present as
    // soon as the SSR HTML is parsed, which is what we actually need.
    await page.waitForSelector("#__APOLLO_STATE__", { state: "attached" });

    const state = (await page.evaluate(() => {
      const el = document.getElementById("__APOLLO_STATE__");
      return el?.textContent ? JSON.parse(el.textContent) : {};
    })) as ApolloState;

    const products = Object.values(state).filter(isProduct);

    return products.flatMap((product): SearchResult[] => {
      const auctionRef = product.cheapestAuction?.__ref;
      const auction = auctionRef ? state[auctionRef] : undefined;
      if (!isAuction(auction)) return [];

      const price = pickPrice(auction, request.currency);
      if (!price) return [];

      const isInstant = auction.merchant?.deliveryAuthorizationTerm?.value === "INSTANT";

      return [
        {
          product: product.name,
          country: product.regions?.[0]?.name ?? "Global",
          currency: price.currency,
          price: price.amount,
          available: auction.isInStock && auction.isAddableToCart,
          deliveryTime: isInstant ? "Instant" : "Manual",
          reference: product.slug,
        },
      ];
    });
  }

  protected async performLogin(_page: Page): Promise<void> {
    throw new Error(
      "EnebaConnector.performLogin is not implemented — Eneba's login is a client-rendered modal with no " +
        "inspectable static markup. Record it yourself with `npx playwright codegen https://www.eneba.com` " +
        "while logged into your own account."
    );
  }

  protected async performPurchase(
    _page: Page,
    _request: PurchaseRequest,
    _onManualAuthRequired: ManualAuthHandler
  ): Promise<PurchaseResult> {
    throw new Error(
      "EnebaConnector.performPurchase is not implemented — Eneba's cart/checkout flow requires an " +
        "authenticated session that could not be inspected here. Record the add-to-cart -> checkout -> " +
        "voucher-reveal flow with Playwright codegen against your own account, then implement this method."
    );
  }

  protected async performVerify(_page: Page, _request: VerificationRequest): Promise<boolean> {
    throw new Error("EnebaConnector.performVerify is not implemented — see performPurchase.");
  }

  protected async performHealthCheck(): Promise<HealthStatus> {
    const session = await this.browserManager.open();
    try {
      const response = await session.page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      const ok = !!response && response.ok();
      return {
        state: ok ? "healthy" : "degraded",
        message: ok ? undefined : `Unexpected status ${response?.status()}`,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      await this.browserManager.close(session);
    }
  }
}
