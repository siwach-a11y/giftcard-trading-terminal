"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExecutionResult, Offer, ScoreBreakdown, SearchRequest } from "@/models";
import { ExecutionLog, LogEntry } from "./ExecutionLog";
import { ExecutionPanel } from "./ExecutionPanel";
import { OfferTable } from "./OfferTable";
import { SearchPanel } from "./SearchPanel";

const MAX_LOG_ENTRIES = 300;

export function Dashboard() {
  const [connectorCount, setConnectorCount] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ranking, setRanking] = useState<ScoreBreakdown[]>([]);
  const [bestOfferId, setBestOfferId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [executingOfferId, setExecutingOfferId] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/connectors")
      .then((r) => r.json())
      .then((data) => setConnectorCount(data.connectors?.length ?? 0))
      .catch(() => setConnectorCount(0));
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const handler = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as LogEntry;
        setLogEntries((prev) => [...prev.slice(-MAX_LOG_ENTRIES + 1), parsed]);
      } catch {
        // ignore malformed frames
      }
    };
    source.onmessage = handler;

    return () => source.close();
  }, []);

  const runSearch = useCallback(async (request: SearchRequest) => {
    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      setOffers(data.offers ?? []);
      setRanking(data.ranking ?? []);
      setBestOfferId(data.bestOffer?.id ?? null);
      setExplanation(data.explanation ?? "");
    } finally {
      setSearching(false);
    }
  }, []);

  const pollExecution = useCallback((executionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/execute/${executionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setExecution(data.result);
      if (["completed", "failed", "timed_out"].includes(data.result?.status)) {
        setExecutingOfferId(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1500);
  }, []);

  const runExecute = useCallback(
    async (offer: Offer) => {
      setExecutingOfferId(offer.id);
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer, quantity: 1 }),
      });
      const data = await res.json();
      if (data.result) {
        setExecution(data.result);
        pollExecution(data.result.id);
      } else {
        setExecutingOfferId(null);
      }
    },
    [pollExecution]
  );

  const resumeManualAuth = useCallback(async () => {
    if (!execution) return;
    await fetch(`/api/execute/${execution.id}/resume`, { method: "POST" });
  }, [execution]);

  const retryExecution = useCallback(() => {
    if (execution) runExecute(execution.offer);
  }, [execution, runExecute]);

  const copyVoucher = useCallback(() => {
    const code = execution?.purchaseResult?.voucher?.code;
    if (code) navigator.clipboard?.writeText(code);
  }, [execution]);

  const refreshExecution = useCallback(async () => {
    if (!execution) return;
    const res = await fetch(`/api/execute/${execution.id}`);
    if (res.ok) setExecution((await res.json()).result);
  }, [execution]);

  return (
    <div className="terminal-grid">
      <div className="terminal-left">
        <SearchPanel onSearch={runSearch} loading={searching} connectorCount={connectorCount} />
      </div>
      <div className="terminal-center">
        <OfferTable offers={offers} ranking={ranking} bestOfferId={bestOfferId} onExecute={runExecute} executingOfferId={executingOfferId} />
        {explanation && <div className="routing-explanation">{explanation}</div>}
      </div>
      <div className="terminal-right">
        <ExecutionPanel
          execution={execution}
          onResume={resumeManualAuth}
          onRetry={retryExecution}
          onCopyVoucher={copyVoucher}
          onRefresh={refreshExecution}
        />
      </div>
      <div className="terminal-bottom">
        <ExecutionLog entries={logEntries} connected={connected} />
      </div>
    </div>
  );
}
