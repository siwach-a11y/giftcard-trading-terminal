"use client";

import { Offer, ScoreBreakdown } from "@/models";
import { connectorHue } from "./connectorColor";

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
      <div className="panel-header">
        <span>OFFERS</span> {offers.length > 0 && <span className="dim">({offers.length})</span>}
      </div>
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
                <td colSpan={8}>
                  <div className="empty-state">
                    <span className="empty-state-icon">◈</span>
                    No offers yet. Run a search.
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((offer) => {
              const score = scoreByOfferId.get(offer.id);
              const isBest = offer.id === bestOfferId;
              const scorePercent = score ? Math.max(0, Math.min(100, score.finalScore * 100)) : 0;
              return (
                <tr key={offer.id} className={isBest ? "row-best" : ""}>
                  <td>
                    <span className="connector-tag">
                      <span className="connector-dot" style={{ background: `hsl(${connectorHue(offer.connectorId)}, 70%, 60%)` }} />
                      {offer.connectorId}
                    </span>
                  </td>
                  <td className="cell-product">
                    {isBest && <span className="best-chip">★ BEST</span>}
                    {offer.product}
                  </td>
                  <td className="dim">
                    {offer.country || "—"} / {offer.currency || "—"}
                  </td>
                  <td className="cell-price">{offer.price.toFixed(2)}</td>
                  <td>
                    <span className={`pill ${offer.available ? "pill-green" : "pill-red"}`}>
                      {offer.available ? "IN STOCK" : "UNAVAILABLE"}
                    </span>
                  </td>
                  <td className="dim">{offer.searchDuration}ms</td>
                  <td>
                    {score ? (
                      <span className="score-cell">
                        <span className="score-bar">
                          <span className="score-bar-fill" style={{ width: `${scorePercent}%` }} />
                        </span>
                        <span className="score-value">{score.finalScore.toFixed(3)}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
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
