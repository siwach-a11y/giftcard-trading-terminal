import { Connector } from "./base/connector.interface";

/**
 * In-memory registry of connectors, populated purely via dependency
 * injection at application bootstrap (see `src/app`'s server init). No
 * connector is ever hardcoded or imported by name here — this file has no
 * knowledge that any particular connector exists.
 */
export class ConnectorRegistry {
  private readonly connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    if (this.connectors.has(connector.id)) {
      throw new Error(`Connector already registered: ${connector.id}`);
    }
    this.connectors.set(connector.id, connector);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }

  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  list(): Connector[] {
    return [...this.connectors.values()];
  }

  listEnabled(): Connector[] {
    return this.list().filter((c) => c.enabled);
  }
}

/** Process-wide registry. Real connectors are registered against this instance at startup. */
export const connectorRegistry = new ConnectorRegistry();
