export type HealthState = "healthy" | "degraded" | "down";

export interface HealthStatus {
  state: HealthState;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}
