import { getConfig } from "@/config/config";
import { ConnectorSignals, ConnectorSignalsProvider } from "@/core/scoring/connector-signals.provider";
import { ExecutionHistoryRepository } from "./execution-history.repository";
import { SettingsRepository } from "./settings.repository";

const RISK_SETTING_PREFIX = "risk:";

/**
 * Resolves reliability from historical execution outcomes and risk from a
 * manually configured Settings row (`risk:<connectorId>` -> "0" | "0.2" |
 * "0.5" | "1"), falling back to `scoring.defaultRisk` when unset.
 */
export class ConnectorSignalsRepository implements ConnectorSignalsProvider {
  constructor(
    private readonly executionHistory: ExecutionHistoryRepository,
    private readonly settings: SettingsRepository
  ) {}

  async getSignals(connectorId: string): Promise<ConnectorSignals> {
    const [{ successful, total }, riskSetting] = await Promise.all([
      this.executionHistory.successRate(connectorId),
      this.settings.get(`${RISK_SETTING_PREFIX}${connectorId}`),
    ]);

    const reliability = total > 0 ? successful / total : 1;
    const risk = riskSetting !== undefined ? Number(riskSetting) : getConfig().scoring.defaultRisk;

    return { reliability, risk };
  }
}
