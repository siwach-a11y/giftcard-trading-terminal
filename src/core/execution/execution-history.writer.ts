import { ExecutionResult } from "@/models";

/**
 * Persistence boundary the Execution Engine writes through. Implemented by
 * `src/database/repositories/execution-history.repository.ts`.
 */
export interface ExecutionHistoryWriter {
  record(result: ExecutionResult): Promise<void>;
}
