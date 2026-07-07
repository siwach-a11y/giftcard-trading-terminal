/**
 * Generic success/failure envelope used across core services so callers
 * handle failure explicitly instead of relying on thrown exceptions for
 * expected outcomes (e.g. "connector reported no stock").
 */
export type Result<T, E = TerminalError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface TerminalError {
  code: string;
  message: string;
  cause?: unknown;
}

export function terminalError(code: string, message: string, cause?: unknown): TerminalError {
  return { code, message, cause };
}
