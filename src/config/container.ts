import { connectorRegistry } from "@/connectors/registry";
import { EventBus, eventBus } from "@/core/events/event-bus";
import { ExecutionEngine } from "@/core/execution/execution-engine";
import { VoucherParser } from "@/core/execution/voucher-parser";
import { Logger } from "@/core/logging/logger";
import { SmartOrderRouter } from "@/core/routing/smart-order-router";
import { ScoringEngine } from "@/core/scoring/scoring-engine";
import { TradingEngine } from "@/core/trading/trading-engine";
import {
  ConnectorHealthRepository,
  ConnectorSignalsRepository,
  ExecutionHistoryRepository,
  RoutingHistoryRepository,
  SearchHistoryRepository,
  SettingsRepository,
} from "@/database/repositories";

/**
 * Composition root. Every core service is dependency-injected here, once,
 * and Next.js server code (API routes) imports this instead of
 * `new`-ing services directly. No connector is registered here — that only
 * happens once a real connector exists, per `src/connectors/README.md`.
 */
class Container {
  readonly eventBus: EventBus = eventBus;
  readonly logger = new Logger(this.eventBus);

  readonly searchHistoryRepository = new SearchHistoryRepository();
  readonly executionHistoryRepository = new ExecutionHistoryRepository();
  readonly routingHistoryRepository = new RoutingHistoryRepository();
  readonly connectorHealthRepository = new ConnectorHealthRepository();
  readonly settingsRepository = new SettingsRepository();
  readonly connectorSignalsRepository = new ConnectorSignalsRepository(
    this.executionHistoryRepository,
    this.settingsRepository
  );

  readonly connectorRegistry = connectorRegistry;
  readonly scoringEngine = new ScoringEngine();
  readonly voucherParser = new VoucherParser();

  readonly tradingEngine = new TradingEngine(this.connectorRegistry, this.searchHistoryRepository);
  readonly smartOrderRouter = new SmartOrderRouter(this.scoringEngine, this.connectorSignalsRepository);
  readonly executionEngine = new ExecutionEngine(
    this.connectorRegistry,
    this.voucherParser,
    this.executionHistoryRepository
  );
}

const globalForContainer = globalThis as unknown as { terminalContainer?: Container };

export const container = globalForContainer.terminalContainer ?? new Container();

if (process.env.NODE_ENV !== "production") {
  globalForContainer.terminalContainer = container;
}
