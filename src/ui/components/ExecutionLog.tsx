"use client";

export interface LogEntry {
  timestamp: string;
  event: string;
  payload: unknown;
}

interface Props {
  entries: LogEntry[];
  connected: boolean;
}

function eventCategory(event: string): string {
  if (event.startsWith("error")) return "error";
  if (event.startsWith("execution.failed") || event.includes("manual_auth")) return "warn";
  if (event.startsWith("execution") || event.startsWith("voucher")) return "execution";
  if (event.startsWith("routing")) return "routing";
  if (event.startsWith("search")) return "search";
  return "info";
}

export function ExecutionLog({ entries, connected }: Props) {
  return (
    <div className="panel execution-log-panel">
      <div className="panel-header">
        <span>EXECUTION LOG</span>
        <span className={`conn-status ${connected ? "conn-live" : "conn-dead"}`}>
          <span className="conn-dot" />
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>
      <div className="log-scroll">
        {entries.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">≡</span>
            No activity yet.
          </div>
        )}
        {entries.map((entry, idx) => (
          <div key={idx} className={`log-line log-line-${eventCategory(entry.event)}`}>
            <span className="dim log-time">{entry.timestamp.split("T")[1]?.replace("Z", "")}</span>
            <span className="log-event">{entry.event}</span>
            <span className="dim log-payload">{JSON.stringify(entry.payload)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
