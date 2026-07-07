import { Offer, SearchRequest } from "@/models";

/**
 * Persistence boundary the Trading Engine writes through. Implemented by
 * `src/database/repositories/search-history.repository.ts` and injected at
 * startup, so the engine itself has no knowledge of Prisma/SQLite.
 */
export interface SearchHistoryWriter {
  record(requestId: string, request: SearchRequest, offers: Offer[], durationMs: number): Promise<void>;
}
