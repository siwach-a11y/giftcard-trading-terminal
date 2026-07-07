# Connectors

This directory contains the framework for plugging a real gift-card or
e-voucher website into the trading terminal, plus four real, named
connectors added at the operator's request:

| Connector | Site | Status |
| --- | --- | --- |
| `eneba.connector.ts` | eneba.com | **`performSearch` fully working** against real, live data. `performLogin`/`performPurchase`/`performVerify` unimplemented. |
| `g2a.connector.ts` | g2a.com | Empty shell — blocked by Akamai bot-detection during inspection. |
| `cardcash.connector.ts` | cardcash.com | Empty shell — blocked by a Cloudflare bot-challenge during inspection. |
| `kinguin.connector.ts` | kinguin.net | Empty shell — blocked by a Cloudflare bot-challenge during inspection. |

No fabricated vendor, domain, or product catalog exists anywhere here — see
the "why some of these are empty" section below for what that means in
practice.

## Framework pieces

- `base/connector.interface.ts` — the `Connector` contract every integration
  implements.
- `base/playwright.connector.ts` — an abstract base class that handles
  browser lifecycle, retries, screenshots-on-error, and event emission, so a
  real connector only has to implement the vendor-specific steps.
- `registry.ts` — a dependency-injected `ConnectorRegistry`. All four
  connectors above are registered in `src/config/container.ts`; nothing is
  hardcoded into the registry itself.

## Why Eneba works and the other three don't (yet)

Building `EnebaConnector.performSearch` required inspecting the site's
actual search page. Eneba server-renders a GraphQL/Apollo state dump
(`#__APOLLO_STATE__`) containing real `Product` and `Auction` objects —
name, price, currency, stock, delivery speed — which is what the connector
parses. This was verified against a real fetch, not guessed.

G2A, CardCash, and Kinguin all rejected that same kind of inspection
request outright: G2A's edge (Akamai) returned a hard "Access Denied", and
CardCash/Kinguin both served a Cloudflare "Just a moment..." bot-challenge
page. **Bypassing bot-detection is out of scope for this project** — so
their search/login/checkout DOM structure was never seen, and per this
project's core rule ("if vendor information is unknown, create only an
empty connector — never hallucinate"), nothing was guessed. Each of their
`perform*` methods throws a descriptive error explaining exactly this
instead of silently returning fake data.

## Completing an empty connector (G2A / CardCash / Kinguin) or adding a new one

1. Log into the site yourself in a real browser, then run:
   ```bash
   npx playwright codegen https://www.g2a.com   # or cardcash.com / kinguin.net
   ```
   This records your real clicks/selectors as you search, log in, add to
   cart, and check out — the only reliable way to get real selectors for a
   bot-protected or heavily client-rendered site.
2. Replace the `throw new Error(...)` in the matching `perform*` method with
   the recorded steps, adapted to the method signatures already defined:
   - `performLogin(page)`
   - `performSearch(page, request)`
   - `performPurchase(page, request, onManualAuthRequired)`
   - `performVerify(page, request)`
   - `performHealthCheck()`
3. Call `onManualAuthRequired(message)` and then `await` the site's own
   post-auth state — never attempt to script past a login challenge,
   CAPTCHA, or 2FA step.
4. Give it real `deliveryTime`/`price`/etc. from what the site actually
   shows — the Trading Engine and Smart Order Router work with whatever a
   connector honestly reports, and produce misleading rankings if fed
   invented numbers.

A brand-new connector for a fifth site follows the same steps, in a new
flat file (`src/connectors/my-real-vendor.connector.ts`, no subfolder),
registered in `src/config/container.ts`.
