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

export function ExecutionLog({ entries, connected }: Props) {
  return (
    <div className="panel execution-log-panel">
      <div className="panel-header">
        EXECUTION LOG
        <span className={`conn-dot ${connected ? "conn-live" : "conn-dead"}`} title={connected ? "live" : "disconnected"} />
      </div>
      <div className="log-scroll">
        {entries.length === 0 && <div className="empty-row">No activity yet.</div>}
        {entries.map((entry, idx) => (
          <div key={idx} className="log-line">
            <span className="dim">{entry.timestamp.split("T")[1]?.replace("Z", "")}</span>{" "}
            <span className="log-event">{entry.event}</span>{" "}
            <span className="dim">{JSON.stringify(entry.payload)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
