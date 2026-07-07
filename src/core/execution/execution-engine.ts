import { ConnectorRegistry } from "@/connectors/registry";
import { getConfig } from "@/config/config";
import { eventBus } from "@/core/events/event-bus";
import { ExecutionResult, Offer } from "@/models";
import { generateId } from "@/shared/id";
import { ExecutionHistoryWriter } from "./execution-history.writer";
import { VoucherParser } from "./voucher-parser";

export class ExecutionTimeoutError extends Error {}

interface PendingManualAuth {
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Drives a single purchase from a selected {@link Offer} through to a final
 * {@link ExecutionResult}: launches the connector's purchase flow, enforces
 * the configured timeout, retries failed attempts, and owns the actual
 * pause/resume state when a connector reports it needs manual
 * authentication. The dashboard's "Resume" action calls
 * {@link ExecutionEngine.resumeManualAuth} after the operator has completed
 * that step in the visible browser window.
 */
export class ExecutionEngine {
  private readonly pendingManualAuth = new Map<string, PendingManualAuth>();
  private readonly liveResults = new Map<string, ExecutionResult>();

  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly voucherParser: VoucherParser,
    private readonly executionHistoryWriter?: ExecutionHistoryWriter
  ) {}

  getExecution(executionId: string): ExecutionResult | undefined {
    return this.liveResults.get(executionId);
  }

  resumeManualAuth(executionId: string): void {
    const pending = this.pendingManualAuth.get(executionId);
    if (!pending) {
      throw new Error(`No pending manual authentication for execution "${executionId}"`);
    }
    pending.resolve();
    this.pendingManualAuth.delete(executionId);
  }

  async execute(offer: Offer, quantity = 1): Promise<ExecutionResult> {
    const connector = this.registry.get(offer.connectorId);
    if (!connector) {
      throw new Error(`No connector registered for id "${offer.connectorId}"`);
    }

    const executionId = generateId("exec");
    const { retries } = getConfig().browser;
    const maxAttempts = retries + 1;

    let result: ExecutionResult = {
      id: executionId,
      offer,
      status: "pending",
      attempt: 0,
      maxAttempts,
      startedAt: new Date().toISOString(),
    };
    this.setResult(result);
    eventBus.emit("execution.started", { executionId, offer });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result = { ...result, status: "running", attempt };
      this.setResult(result);
      eventBus.emit("execution.progress", { executionId, status: "running" });

      try {
        const purchaseResult = await this.runWithTimeout(executionId, () =>
          connector.purchase({
            offer,
            quantity,
            onManualAuthRequired: (message) => this.waitForManualAuth(executionId, message),
          })
        );

        if (purchaseResult.voucher) {
          const valid = this.voucherParser.validate(purchaseResult.voucher);
          eventBus.emit("voucher.extracted", { executionId, success: valid });
        }

        result = {
          ...result,
          status: purchaseResult.status === "success" ? "completed" : "failed",
          purchaseResult,
          finishedAt: new Date().toISOString(),
        };
        this.setResult(result);
        eventBus.emit("execution.completed", { executionId, result });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const timedOut = error instanceof ExecutionTimeoutError;
        eventBus.emit("execution.failed", { executionId, error: message });

        const isFinalAttempt = attempt >= maxAttempts;
        result = {
          ...result,
          status: isFinalAttempt ? (timedOut ? "timed_out" : "failed") : "retrying",
          error: message,
          finishedAt: isFinalAttempt ? new Date().toISOString() : undefined,
        };
        this.setResult(result);

        if (isFinalAttempt) {
          eventBus.emit("execution.completed", { executionId, result });
        } else {
          eventBus.emit("execution.progress", { executionId, status: "retrying", message });
        }
      }
    }

    if (this.executionHistoryWriter) {
      await this.executionHistoryWriter.record(result);
    }
    return result;
  }

  private setResult(result: ExecutionResult): void {
    this.liveResults.set(result.id, result);
  }

  private async waitForManualAuth(executionId: string, message: string): Promise<void> {
    const { manualAuthTimeoutMs } = getConfig().execution;
    const current = this.liveResults.get(executionId);
    if (current) {
      this.setResult({ ...current, status: "awaiting_manual_auth" });
    }
    eventBus.emit("execution.manual_auth_required", { executionId, message });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingManualAuth.delete(executionId);
        reject(new Error(`Manual authentication was not completed within ${manualAuthTimeoutMs}ms`));
      }, manualAuthTimeoutMs);

      this.pendingManualAuth.set(executionId, {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  private async runWithTimeout<T>(executionId: string, fn: () => Promise<T>): Promise<T> {
    const { maxDurationMs } = getConfig().execution;
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new ExecutionTimeoutError(`Execution "${executionId}" exceeded ${maxDurationMs}ms`)),
          maxDurationMs
        )
      ),
    ]);
  }
}
