# Gift Card Trading Terminal

A personal procurement terminal for E-Gift Cards and E-Vouchers. One
operator, one dashboard. It compares offers across configured websites and
executes purchases via browser automation (Playwright) — never a
marketplace, never a SaaS, no customers, no accounts to manage other than
the operator's own.

## What's in this repo

The full framework described in the build spec: domain models, the
Connector contract + abstract Playwright base class, a dependency-injected
Connector Registry, the Trading Engine (`searchAll`), the Scoring Engine +
Smart Order Router, the Execution Engine (with manual-auth pause/resume,
retries, timeouts, screenshots), a generic Voucher Parser, a SQLite/Prisma
persistence layer, and a dark trading-terminal dashboard UI.

**Four real connectors are registered** (`src/config/container.ts`):
Eneba, G2A, CardCash, Kinguin. Only **Eneba's search** is actually
implemented, against real, verified site structure — the other three (and
Eneba's own login/purchase/verify) are empty shells that throw a clear
"not implemented" error instead of guessing selectors, because their sites
blocked automated inspection with bot-detection that this project won't
bypass. See [`src/connectors/README.md`](src/connectors/README.md) for the
full status table and how to complete any of them yourself with
`npx playwright codegen` against your own logged-in session.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full class
diagram, sequence diagrams, and the scoring formula.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # DATABASE_URL for the SQLite dev DB
cp .env.local.example .env         # Prisma CLI reads .env, not .env.local
npx prisma db push                 # creates prisma/dev.db from prisma/schema.prisma
npm run dev
```

Open http://localhost:3000. Searching a product (e.g. "steam") returns real
live offers from Eneba; G2A/CardCash/Kinguin will show up as failed
connectors in the execution log until their connectors are completed (see
below). Playwright needs its browser binary once: `npx playwright install chromium`.

## Configuration

All operator-tunable behavior lives in [`config/default.yaml`](config/default.yaml):

```yaml
weights:
  price: 0.45
  availability: 0.20
  speed: 0.15
  reliability: 0.10
  risk: 0.10

browser:
  headless: false
  timeout: 30000
  retries: 3
```

Point at a different file with `TRADING_TERMINAL_CONFIG=/path/to/file.yaml`.

## Completing or adding a connector

1. Extend `PlaywrightConnector` (`src/connectors/base/playwright.connector.ts`)
   in a new file under `src/connectors/`, or edit one of the four existing
   ones.
2. Implement the abstract vendor-specific steps: `performLogin`,
   `performSearch`, `performPurchase`, `performVerify`, `performHealthCheck`.
   For a bot-protected or heavily client-rendered site, record real
   selectors with `npx playwright codegen <url>` against your own logged-in
   session rather than guessing.
3. Register it at startup: `connectorRegistry.register(new YourConnector())`
   in `src/config/container.ts` (the four existing connectors are already
   wired here).
4. Never script past a login challenge, CAPTCHA, or 2FA/OTP step — call the
   `onManualAuthRequired` handler and let the Execution Engine pause until
   you complete it by hand in the visible browser window, then click
   **Resume** in the dashboard.

Full details, plus a status table for the four existing connectors, in
[`src/connectors/README.md`](src/connectors/README.md).

**Note on Terms of Service:** most gift-card marketplaces' ToS restrict
automated access. This tool never bypasses login/CAPTCHA/2FA, but running
any of these connectors against your own account is still something to
weigh yourself before doing it.

## Dashboard layout

- **Left** — Search panel (product / country / currency / face value / quantity)
- **Center** — Offer table (Connector, Product, Country, Price, Availability, Search Time, Score, Action) with the Smart Order Router's pick highlighted
- **Right** — Execution panel (status, attempt count, manual-auth Resume button, voucher code + Copy Voucher)
- **Bottom** — Live execution log (server-sent events streamed from the shared event bus — every search, routing decision, execution step, and error)

## Static site (GitHub Pages)

`npm run build:static` produces a static export with the API route
handlers excluded from the build — this app's actual purpose (Playwright
execution, Prisma persistence) needs a real Node server and can never
fully run on a static host like GitHub Pages. Two ways to deploy it:

```bash
npm run deploy:pages         # offline UI-only preview: Search/Execute/log are no-ops, honest empty state
CLOUD_API_BASE_URL=https://your-backend.example.com npm run deploy:pages:live   # points the static site at a real backend
```

The **live public demo** at https://siwach-a11y.github.io/giftcard-trading-terminal/
uses the second form, pointed at a search-only backend deployed to Cloud
Run (see "Public demo backend" below) — real Eneba search results, but
Execute/purchase always reports "not implemented" since no connector's
purchase flow is built yet.

Both scripts set `PAGES_BASE_PATH=/giftcard-trading-terminal` for GitHub
Pages' project-site path and require the `gh-pages` branch enabled as the
Pages source in the repo's Settings.

## Public demo backend (Cloud Run)

`Dockerfile` + `docker-entrypoint.sh` + `config/cloud.yaml` package a
**search-only** copy of this app (headless Chromium, no manual-auth
support, no persistence across restarts) for the GitHub Pages demo to call.
Full rationale and constraints in
[`docs/ARCHITECTURE.md` → "Public demo backend"](docs/ARCHITECTURE.md#public-demo-backend).

```bash
gcloud run deploy giftcard-terminal-demo-api --source . --region asia-southeast1 \
  --allow-unauthenticated --port 8080 --memory 1Gi --cpu 1 \
  --concurrency 1 --max-instances 2 --timeout 90 \
  --set-env-vars "CORS_ALLOWED_ORIGINS=https://siwach-a11y.github.io"
```

This is not required to use the terminal for real — it exists purely so
the public link can show live results. The actual personal workflow is
`npm run dev` locally, where purchase execution can actually work once a
connector's `performPurchase` is implemented.

## Persistence

SQLite via Prisma (`prisma/schema.prisma`): `SearchHistory`,
`ExecutionHistory`, `RoutingHistory`, `ConnectorHealth`, `Settings`. No
vendor-specific tables — connectors are referenced only by their opaque
`connectorId` string.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dashboard locally |
| `npm run build` / `npm run start` | Production build/run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` / `npm run db:studio` | Prisma schema sync / data browser |
| `npm run build:static` | Build the UI-only static export into `./out` |
| `npm run deploy:pages` | Build static (offline) + publish to the `gh-pages` branch |
| `npm run deploy:pages:live` | Build static against `$CLOUD_API_BASE_URL` + publish |

## Known trade-offs

- `npm audit` reports a handful of Next.js/postcss advisories that are only
  fully resolved by upgrading to Next.js 16 (a breaking change to the App
  Router APIs used here). Acceptable for a terminal that only ever binds to
  `localhost` for a single operator; revisit if this is ever exposed beyond
  that.
