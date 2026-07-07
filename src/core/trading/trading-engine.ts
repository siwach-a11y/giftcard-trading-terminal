import { ConnectorRegistry } from "@/connectors/registry";
import { eventBus } from "@/core/events/event-bus";
import { Offer, SearchRequest } from "@/models";
import { generateId } from "@/shared/id";
import { SearchHistoryWriter } from "./search-history.writer";

/**
 * Entry point for "the operator types a query". Fans the request out to
 * every enabled connector in parallel, normalizes each connector's raw
 * results into comparable {@link Offer}s, and hands them to the Smart Order
 * Router's caller (the API layer) — the engine itself does not rank.
 */
export class TradingEngine {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly searchHistoryWriter?: SearchHistoryWriter
  ) {}

  async searchAll(request: SearchRequest): Promise<Offer[]> {
    const requestId = generateId("search");
    const startedAt = Date.now();
    eventBus.emit("search.started", { requestId, request });

    const connectors = this.registry.listEnabled();

    const resultsByConnector = await Promise.all(
      connectors.map(async (connector) => {
        const connectorStartedAt = Date.now();
        try {
          const results = await connector.search(request);
          const durationMs = Date.now() - connectorStartedAt;
          eventBus.emit("search.connector.completed", {
            requestId,
            connectorId: connector.id,
            offerCount: results.length,
            durationMs,
          });
          return results.map<Offer>((result) => ({
            id: generateId("offer"),
            connectorId: connector.id,
            product: result.product,
            country: result.country,
            currency: result.currency,
            price: result.price,
            available: result.available,
            deliveryTime: result.deliveryTime,
            searchDuration: durationMs,
            timestamp: new Date().toISOString(),
            reference: result.reference,
          }));
        } catch (error) {
          eventBus.emit("search.connector.failed", {
            requestId,
            connectorId: connector.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return [];
        }
      })
    );

    const offers = resultsByConnector.flat();
    const durationMs = Date.now() - startedAt;
    eventBus.emit("search.completed", { requestId, offers, durationMs });

    if (this.searchHistoryWriter) {
      await this.searchHistoryWriter.record(requestId, request, offers, durationMs);
    }

    return offers;
  }
}
