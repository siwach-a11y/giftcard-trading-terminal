"use client";

import { useState } from "react";
import { SearchRequest } from "@/models";

interface Props {
  onSearch: (request: SearchRequest) => void;
  loading: boolean;
  connectorCount: number;
}

export function SearchPanel({ onSearch, loading, connectorCount }: Props) {
  const [product, setProduct] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [faceValue, setFaceValue] = useState("");
  const [quantity, setQuantity] = useState("1");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product.trim()) return;
    onSearch({
      product: product.trim(),
      country: country.trim() || undefined,
      currency: currency.trim() || undefined,
      faceValue: faceValue ? Number(faceValue) : undefined,
      quantity: quantity ? Number(quantity) : undefined,
    });
  }

  return (
    <div className="panel search-panel">
      <div className="panel-header">
        <span>SEARCH</span>
      </div>
      <form onSubmit={submit} className="search-form">
        <label>
          Product
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Steam USD20" autoFocus />
        </label>
        <label>
          Country
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="optional" />
        </label>
        <label>
          Currency
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="optional" />
        </label>
        <label>
          Face value
          <input value={faceValue} onChange={(e) => setFaceValue(e.target.value)} placeholder="optional" type="number" />
        </label>
        <label>
          Quantity
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={1} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading || !product.trim()}>
          {loading ? (
            <>
              <span className="btn-spinner" /> Searching…
            </>
          ) : (
            "⌕ Search"
          )}
        </button>
      </form>
      <div className="panel-footnote">
        {connectorCount === 0
          ? "No connectors registered. See src/connectors/README.md."
          : `${connectorCount} connector(s) enabled`}
      </div>
    </div>
  );
}
