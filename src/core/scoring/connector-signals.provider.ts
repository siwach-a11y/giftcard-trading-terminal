/**
 * Per-connector inputs the Scoring Engine cannot derive from a single offer
 * alone. Reliability comes from historical execution outcomes; risk is a
 * manually configured operator judgment (0 / 0.2 / 0.5 / 1) — never
 * computed automatically.
 */
export interface ConnectorSignals {
  reliability: number;
  risk: number;
}

export interface ConnectorSignalsProvider {
  getSignals(connectorId: string): Promise<ConnectorSignals>;
}
