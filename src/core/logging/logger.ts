import fs from "node:fs";
import path from "node:path";
import { getConfig } from "@/config/config";
import { EventBus } from "@/core/events/event-bus";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Structured, event-driven logger. Nothing calls `logger.info(...)` from
 * inside business logic — core services emit domain events on the shared
 * {@link EventBus} and the Logger is just one more subscriber, so adding a
 * new sink (e.g. shipping logs elsewhere) never touches trading/routing/
 * execution code.
 */
export class Logger {
  private readonly minLevel: number;
  private readonly destination: string;

  constructor(private readonly bus: EventBus) {
    const config = getConfig();
    this.minLevel = LEVEL_ORDER[config.logging.level];
    this.destination = path.resolve(process.cwd(), config.logging.destination);
    fs.mkdirSync(path.dirname(this.destination), { recursive: true });
    this.subscribeToDomainEvents();
  }

  log(level: LogLevel, scope: string, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < this.minLevel) return;
    const record: LogRecord = { timestamp: new Date().toISOString(), level, scope, message, data };
    const line = JSON.stringify(record);
    fs.appendFile(this.destination, line + "\n", () => {});
    const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleMethod(`[${record.timestamp}] [${level.toUpperCase()}] [${scope}] ${message}`, data ?? "");
  }

  debug(scope: string, message: string, data?: Record<string, unknown>): void {
    this.log("debug", scope, message, data);
  }
  info(scope: string, message: string, data?: Record<string, unknown>): void {
    this.log("info", scope, message, data);
  }
  warn(scope: string, message: string, data?: Record<string, unknown>): void {
    this.log("warn", scope, message, data);
  }
  error(scope: string, message: string, data?: Record<string, unknown>): void {
    this.log("error", scope, message, data);
  }

  private subscribeToDomainEvents(): void {
    this.bus.on("search.started", (p) =>
      this.info("search", `search started: ${p.request.product}`, p as unknown as Record<string, unknown>)
    );
    this.bus.on("search.connector.completed", (p) =>
      this.info("search", `connector ${p.connectorId} returned ${p.offerCount} offer(s) in ${p.durationMs}ms`, p)
    );
    this.bus.on("search.connector.failed", (p) =>
      this.warn("search", `connector ${p.connectorId} failed: ${p.error}`, p)
    );
    this.bus.on("search.completed", (p) =>
      this.info("search", `search completed with ${p.offers.length} offer(s) in ${p.durationMs}ms`, {
        requestId: p.requestId,
        durationMs: p.durationMs,
        offerCount: p.offers.length,
      })
    );

    this.bus.on("routing.decided", (p) =>
      this.info("routing", p.decision.explanation, { decision: p.decision })
    );

    this.bus.on("execution.started", (p) =>
      this.info("execution", `execution ${p.executionId} started for connector ${p.offer.connectorId}`, p)
    );
    this.bus.on("execution.progress", (p) =>
      this.info("execution", `execution ${p.executionId} -> ${p.status}${p.message ? `: ${p.message}` : ""}`, p)
    );
    this.bus.on("execution.manual_auth_required", (p) =>
      this.warn("execution", `execution ${p.executionId} paused for manual authentication: ${p.message}`, p)
    );
    this.bus.on("execution.completed", (p) =>
      this.info(
        "execution",
        `execution ${p.executionId} finished: ${p.result.status}`,
        p as unknown as Record<string, unknown>
      )
    );
    this.bus.on("execution.failed", (p) => this.error("execution", `execution ${p.executionId} failed: ${p.error}`, p));

    this.bus.on("voucher.extracted", (p) =>
      this.info("voucher", `voucher extraction for ${p.executionId}: ${p.success ? "success" : "failed"}`, p)
    );

    this.bus.on("connector.health.checked", (p) =>
      this.info("health", `connector ${p.connectorId} health: ${p.status.state}`, p as unknown as Record<string, unknown>)
    );

    this.bus.on("screenshot.captured", (p) => this.debug("screenshot", `captured screenshot: ${p.path}`, p));
    this.bus.on("error.captured", (p) => this.error(p.scope, p.error, p as unknown as Record<string, unknown>));
  }
}
