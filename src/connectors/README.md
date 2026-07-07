# Connectors

This directory contains **only the framework** for plugging a real gift-card
or e-voucher website into the trading terminal. It ships with:

- `base/connector.interface.ts` — the `Connector` contract every integration
  implements.
- `base/playwright.connector.ts` — an abstract base class that handles
  browser lifecycle, retries, screenshots-on-error, and event emission, so a
  real connector only has to implement the vendor-specific steps.
- `registry.ts` — a dependency-injected `ConnectorRegistry`. Nothing is
  hardcoded; connectors are registered at application startup.

**No vendor connector is implemented here**, and none will be added
speculatively. This is deliberate: this codebase must never contain
fabricated websites, fake vendor domains, or invented product catalogs.

## Adding a real connector

When you (the operator) are ready to automate a specific website you
personally have an account with and are authorized to interact with:

1. Create a new file, e.g. `src/connectors/my-real-vendor.connector.ts`
   (still no subfolder — keep connectors flat, one file each).
2. Extend `PlaywrightConnector` and implement the abstract vendor-specific
   methods:
   - `performLogin(page)`
   - `performSearch(page, request, attempt)`
   - `performPurchase(page, request, onManualAuthRequired)`
   - `performVerify(page, request)`
   - `performHealthCheck()`
3. Call `onManualAuthRequired(message)` and then `await` the site's own
   post-auth state (e.g. poll for a redirect or a DOM element) — never
   attempt to script past a login challenge, CAPTCHA, or 2FA step.
4. Register an instance with the shared registry at startup:

   ```ts
   import { connectorRegistry } from "@/connectors/registry";
   import { MyRealVendorConnector } from "@/connectors/my-real-vendor.connector";

   connectorRegistry.register(new MyRealVendorConnector());
   ```

5. Give it a real `deliveryTime`/`price`/etc. from what the site actually
   shows — the Trading Engine and Smart Order Router work with whatever a
   connector honestly reports, and produce misleading rankings if fed
   invented numbers.

Until you do this, `connectorRegistry.list()` returns an empty array, the
dashboard's offer table is empty, and that is the correct behavior for a
terminal with no configured connectors yet.
