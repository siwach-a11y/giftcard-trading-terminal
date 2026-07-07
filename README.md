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

**No vendor connector is implemented.** `src/connectors/` intentionally
ships zero subclasses of `PlaywrightConnector` — see
[`src/connectors/README.md`](src/connectors/README.md) for how to plug in a
real website you are personally authorized to automate. Until you do,
`ConnectorRegistry.list()` is empty and the dashboard's offer table stays
empty — that's correct, not a bug.

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

Open http://localhost:3000. The dashboard loads with zero connectors and an
empty offer table until you register one (see below).

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

## Adding a real connector

1. Extend `PlaywrightConnector` (`src/connectors/base/playwright.connector.ts`)
   in a new file under `src/connectors/`.
2. Implement the abstract vendor-specific steps: `performLogin`,
   `performSearch`, `performPurchase`, `performVerify`, `performHealthCheck`.
3. Register it at startup: `connectorRegistry.register(new YourConnector())`
   in `src/config/container.ts`.
4. Never script past a login challenge, CAPTCHA, or 2FA/OTP step — call the
   `onManualAuthRequired` handler and let the Execution Engine pause until
   you complete it by hand in the visible browser window, then click
   **Resume** in the dashboard.

Full details in [`src/connectors/README.md`](src/connectors/README.md).

## Dashboard layout

- **Left** — Search panel (product / country / currency / face value / quantity)
- **Center** — Offer table (Connector, Product, Country, Price, Availability, Search Time, Score, Action) with the Smart Order Router's pick highlighted
- **Right** — Execution panel (status, attempt count, manual-auth Resume button, voucher code + Copy Voucher)
- **Bottom** — Live execution log (server-sent events streamed from the shared event bus — every search, routing decision, execution step, and error)

## Static UI preview (no backend)

This app's actual purpose — Playwright execution, Prisma persistence —
needs a real Node server, so it can never be fully functional on a static
host like GitHub Pages. `npm run build:static` produces a **UI-only
preview**: the API route handlers are excluded from the build, the
dashboard shows a "static preview" banner, and Search/Execute/the live log
become no-ops instead of pretending to have data. It always renders the
same honest empty state you'd see with zero connectors registered — no
invented offers or vendors.

```bash
npm run build:static        # writes ./out
npx serve out                # preview it locally
npm run deploy:pages         # build:static + publish ./out to the gh-pages branch
```

`deploy:pages` sets `PAGES_BASE_PATH=/giftcard-trading-terminal` for GitHub
Pages' project-site path and requires the `gh-pages` branch to be enabled
as the Pages source in the repo's Settings.

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
| `npm run deploy:pages` | Build static + publish to the `gh-pages` branch |

## Known trade-offs

- `npm audit` reports a handful of Next.js/postcss advisories that are only
  fully resolved by upgrading to Next.js 16 (a breaking change to the App
  Router APIs used here). Acceptable for a terminal that only ever binds to
  `localhost` for a single operator; revisit if this is ever exposed beyond
  that.
