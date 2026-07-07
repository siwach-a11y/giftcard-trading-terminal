# Architecture

This is a **personal procurement terminal**, not a marketplace or SaaS. One
operator, one dashboard, zero customers. Everything below describes the
framework that is shipped, plus four real connectors (Eneba's search is
fully working; G2A/CardCash/Kinguin are empty shells blocked by
bot-detection during inspection) — see
[`src/connectors/README.md`](../src/connectors/README.md) for the full
status table.

## Layered flow

```
Dashboard
  ↓
Trading Engine        (searchAll — fans out to every enabled connector)
  ↓
Smart Order Router    (ranks Offer[] by weighted score, explains the pick)
  ↓
Connector Manager      (ConnectorRegistry — DI, no hardcoded connectors)
  ↓
Playwright Connector   (abstract base: browser lifecycle, retries, screenshots)
  ↓
External Website       (real site the operator is personally authorized to use)
  ↓
Voucher Extraction     (VoucherParser — generic code/PIN/expiry parsing)
  ↓
Dashboard
```

## Class diagram

```mermaid
classDiagram
    class Connector {
        <<interface>>
        +id: string
        +name: string
        +enabled: boolean
        +search(request) Promise~SearchResult[]~
        +purchase(request) Promise~PurchaseResult~
        +verify(request) Promise~boolean~
        +health() Promise~HealthStatus~
    }

    class PlaywrightConnector {
        <<abstract>>
        #browserManager: BrowserManager
        #launchBrowser()
        #createContext(browser)
        #waitForNetwork(page)
        #takeScreenshot(page, reason)
        #close(session)
        #retry(fn, label)
        #captureErrors(scope, page, fn)
        #login(page)
        +search(request)
        +purchase(request)
        +verify(request)
        +health()
        #performLogin(page)* 
        #performSearch(page, request, attempt)*
        #performPurchase(page, request, onManualAuthRequired)*
        #performVerify(page, request)*
        #performHealthCheck()*
    }

    class ConnectorRegistry {
        -connectors: Map~string, Connector~
        +register(connector)
        +unregister(id)
        +get(id) Connector
        +list() Connector[]
        +listEnabled() Connector[]
    }

    class TradingEngine {
        -registry: ConnectorRegistry
        -searchHistoryWriter: SearchHistoryWriter
        +searchAll(request) Promise~Offer[]~
    }

    class ScoringEngine {
        +calculateScore(offer, signals, context) ScoreBreakdown
    }

    class SmartOrderRouter {
        -scoringEngine: ScoringEngine
        -signalsProvider: ConnectorSignalsProvider
        +rank(offers) Promise~ScoreBreakdown[]~
        +selectBest(offers, ranked) Offer
        +explainDecision(ranked, bestOffer) string
        +decide(offers) Promise~RoutingDecision~
    }

    class ExecutionEngine {
        -registry: ConnectorRegistry
        -voucherParser: VoucherParser
        -executionHistoryWriter: ExecutionHistoryWriter
        +execute(offer, quantity) Promise~ExecutionResult~
        +resumeManualAuth(executionId)
        +getExecution(executionId) ExecutionResult
    }

    class VoucherParser {
        +extractCode(rawText) string
        +extractPin(rawText) string
        +extractExpiry(rawText) string
        +validate(voucher) boolean
    }

    class EventBus {
        +on(event, listener)
        +onAny(listener)
        +emit(event, payload)
    }

    class Logger {
        +debug(scope, message, data)
        +info(scope, message, data)
        +warn(scope, message, data)
        +error(scope, message, data)
    }

    Connector <|.. PlaywrightConnector
    ConnectorRegistry o-- Connector
    TradingEngine --> ConnectorRegistry
    TradingEngine --> EventBus
    SmartOrderRouter --> ScoringEngine
    SmartOrderRouter --> EventBus
    ExecutionEngine --> ConnectorRegistry
    ExecutionEngine --> VoucherParser
    ExecutionEngine --> EventBus
    Logger --> EventBus
```

## Sequence diagram — search

```mermaid
sequenceDiagram
    actor Operator
    participant UI as Dashboard
    participant TE as TradingEngine
    participant CR as ConnectorRegistry
    participant C as Connector (N instances)
    participant SOR as SmartOrderRouter

    Operator->>UI: type "Steam USD20", click Search
    UI->>TE: searchAll(request)
    TE->>CR: listEnabled()
    CR-->>TE: Connector[]
    par for each enabled connector
        TE->>C: search(request)
        C-->>TE: SearchResult[]
    end
    TE->>TE: normalize results into Offer[]
    TE-->>UI: Offer[]
    UI->>SOR: decide(offers)
    SOR->>SOR: rank() via ScoringEngine
    SOR-->>UI: RoutingDecision (ranked, bestOffer, explanation)
    UI-->>Operator: render Offer Table + best-offer highlight
```

## Sequence diagram — purchase (with manual-auth pause)

```mermaid
sequenceDiagram
    actor Operator
    participant UI as Dashboard
    participant EE as ExecutionEngine
    participant C as Connector
    participant PW as Playwright / Browser

    Operator->>UI: click "Execute" on an offer
    UI->>EE: execute(offer, quantity)
    EE->>C: purchase(request)
    C->>PW: launchBrowser / createContext
    C->>PW: navigate, add to cart, checkout
    alt manual authentication required
        C-->>EE: onManualAuthRequired(message)
        EE-->>UI: execution.manual_auth_required event
        UI-->>Operator: show "Resume" banner
        Operator->>PW: completes 2FA/OTP/CAPTCHA manually
        Operator->>UI: click Resume
        UI->>EE: resumeManualAuth(executionId)
        EE-->>C: resolve pending promise
    end
    C->>PW: continue checkout
    C->>C: VoucherParser.extractCode/Pin/Expiry
    C-->>EE: PurchaseResult (voucher, screenshots)
    EE-->>UI: execution.completed event
    UI-->>Operator: show voucher code, Copy Voucher
```

## Scoring formula

```
FinalScore =
    PriceWeight        * PriceScore
  + AvailabilityWeight * AvailabilityScore
  + SpeedWeight        * SpeedScore
  + ReliabilityWeight  * ReliabilityScore
  - RiskWeight         * RiskScore
```

- `PriceScore = lowestPrice / currentPrice`
- `AvailabilityScore = offer.available ? 1 : 0`
- `SpeedScore = 1 - (searchTime / maxSearchTimeMs)`
- `ReliabilityScore = successfulExecutions / totalExecutions` (from `ExecutionHistory`)
- `RiskScore` — manually configured per connector (`Settings` table, key `risk:<connectorId>`), one of `0 / 0.2 / 0.5 / 1`

All weights live in [`config/default.yaml`](../config/default.yaml) and are
validated by [`src/config/config.schema.ts`](../src/config/config.schema.ts).

## Why some connectors are empty

The brief for this project is explicit: never fabricate a website, vendor,
domain, or product catalog, and never bypass bot-detection to inspect one.
`EnebaConnector.performSearch` is real because Eneba's search page was
actually inspectable (server-rendered GraphQL state). G2A/CardCash/Kinguin
all blocked plain inspection with bot-detection, so their connectors are
honest empty shells rather than guessed selectors — see
[`src/connectors/README.md`](../src/connectors/README.md).

## Public demo backend

The GitHub Pages site (https://siwach-a11y.github.io/giftcard-trading-terminal/)
is a **static export** — no server, so its Search/Execute/live-log are
disabled by default. At the operator's request, a second deployment exists
purely so that public page can show real search results: a **search-only**
copy of this same app runs on Cloud Run (`Dockerfile`, `docker-entrypoint.sh`,
`config/cloud.yaml`), and the static site is built with
`NEXT_PUBLIC_API_BASE_URL` pointed at it (`npm run deploy:pages:live`).

This deployment is deliberately narrow:

- **Headless only, `browser.headless: true`.** Manual-auth pause/resume
  requires a visible browser window, which a cloud container can never
  provide — so this backend only ever supports connectors whose `search()`
  doesn't need a login (currently: Eneba). Purchase execution must run
  locally (`npm run dev`) where you can actually see and interact with the
  browser.
- **No persistence across restarts.** Cloud Run gives each new container
  instance a fresh filesystem; a pre-migrated empty SQLite database is
  baked into the image and copied to `/tmp` on every cold start.
- **CORS locked to the GitHub Pages origin and a small in-memory per-IP
  rate limit** (`src/middleware.ts`), plus `concurrency=1`/`max-instances=2`
  on the Cloud Run service — this is a public, unauthenticated backend, so
  these exist to bound cost and abuse risk, not to make it robust at scale.
- **The Playwright npm package version and the `mcr.microsoft.com/playwright`
  Docker image tag must match exactly** — playwright-core refuses to launch
  a browser build that doesn't match its own version. `playwright` is
  pinned (not caret-ranged) in `package.json` specifically so this can't
  silently drift on a future `npm install`.
