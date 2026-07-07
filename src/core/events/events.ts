import { ExecutionResult, Offer, RoutingDecision, SearchRequest } from "@/models";
import { HealthStatus } from "@/models";

/**
 * Every domain event the terminal can emit. Adding a new one only requires
 * extending this map — {@link EventBus} stays generic.
 */
export interface TerminalEventMap {
  "search.started": { requestId: string; request: SearchRequest };
  "search.connector.completed": {
    requestId: string;
    connectorId: string;
    offerCount: number;
    durationMs: number;
  };
  "search.connector.failed": { requestId: string; connectorId: string; error: string };
  "search.completed": { requestId: string; offers: Offer[]; durationMs: number };

  "routing.decided": { decision: RoutingDecision };

  "execution.started": { executionId: string; offer: Offer };
  "execution.progress": { executionId: string; status: ExecutionResult["status"]; message?: string };
  "execution.manual_auth_required": { executionId: string; message: string };
  "execution.completed": { executionId: string; result: ExecutionResult };
  "execution.failed": { executionId: string; error: string };

  "voucher.extracted": { executionId: string; success: boolean };

  "connector.health.checked": { connectorId: string; status: HealthStatus };

  "screenshot.captured": { executionId: string; path: string; reason: string };
  "error.captured": { scope: string; error: string; cause?: unknown };
}

export type TerminalEventName = keyof TerminalEventMap;
