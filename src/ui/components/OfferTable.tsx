"use client";

import { Offer, ScoreBreakdown } from "@/models";

interface Props {
  offers: Offer[];
  ranking: ScoreBreakdown[];
  bestOfferId?: string | null;
  onExecute: (offer: Offer) => void;
  executingOfferId?: string | null;
}

export function OfferTable({ offers, ranking, bestOfferId, onExecute, executingOfferId }: Props) {
  const scoreByOfferId = new Map(ranking.map((r) => [r.offerId, r]));
  const sorted = [...offers].sort((a, b) => (scoreByOfferId.get(b.id)?.finalScore ?? 0) - (scoreByOfferId.get(a.id)?.finalScore ?? 0));

  return (
    <div className="panel offer-table-panel">
      <div className="panel-header">OFFERS {offers.length > 0 && <span className="dim">({offers.length})</span>}</div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Connector</th>
              <th>Product</th>
              <th>Country</th>
              <th>Price</th>
              <th>Availability</th>
              <th>Search Time</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  No offers yet. Run a search.
                </td>
              </tr>
            )}
            {sorted.map((offer) => {
              const score = scoreByOfferId.get(offer.id);
              const isBest = offer.id === bestOfferId;
              return (
                <tr key={offer.id} className={isBest ? "row-best" : ""}>
                  <td>{offer.connectorId}</td>
                  <td>{offer.product}</td>
                  <td>{offer.country || "—"} / {offer.currency || "—"}</td>
                  <td>{offer.price.toFixed(2)}</td>
                  <td className={offer.available ? "text-green" : "text-red"}>
                    {offer.available ? "IN STOCK" : "UNAVAILABLE"}
                  </td>
                  <td>{offer.searchDuration}ms</td>
                  <td>{score ? score.finalScore.toFixed(3) : "—"}</td>
                  <td>
                    <button
                      className="btn btn-small"
                      disabled={!offer.available || executingOfferId === offer.id}
                      onClick={() => onExecute(offer)}
                    >
                      {executingOfferId === offer.id ? "Executing…" : "Execute"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
