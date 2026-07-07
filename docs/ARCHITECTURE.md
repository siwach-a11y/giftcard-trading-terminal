# Architecture

This is a **personal procurement terminal**, not a marketplace or SaaS. One
operator, one dashboard, zero customers. Everything below describes the
framework that is shipped — no vendor connector is implemented anywhere in
this repository (see [`src/connectors/README.md`](../src/connectors/README.md)).

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

## Why no vendor code exists here

The brief for this project is explicit: never fabricate a website, vendor,
domain, or product catalog. Every piece above is real, generic, and
testable on its own — the only thing missing is the one file a real
connector would add (`src/connectors/<name>.connector.ts`), which requires
knowing an actual site the operator has an account with.
