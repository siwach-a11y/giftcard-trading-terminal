"use client";

import { ExecutionResult } from "@/models";

interface Props {
  execution: ExecutionResult | null;
  onResume: () => void;
  onRetry: () => void;
  onCopyVoucher: () => void;
  onRefresh: () => void;
}

const STATUS_LABEL: Record<ExecutionResult["status"], string> = {
  pending: "PENDING",
  running: "RUNNING",
  awaiting_manual_auth: "AWAITING MANUAL AUTH",
  completed: "COMPLETED",
  failed: "FAILED",
  timed_out: "TIMED OUT",
  retrying: "RETRYING",
};

export function ExecutionPanel({ execution, onResume, onRetry, onCopyVoucher, onRefresh }: Props) {
  return (
    <div className="panel execution-panel">
      <div className="panel-header">
        <span>EXECUTION</span>
        <button className="btn btn-tiny" onClick={onRefresh}>
          ⟳ Refresh
        </button>
      </div>

      {!execution && (
        <div className="empty-state">
          <span className="empty-state-icon">▷</span>
          No execution in progress.
        </div>
      )}

      {execution && (
        <div className="execution-body">
          <div className="execution-row">
            <span className="dim">Connector</span>
            <span>{execution.offer.connectorId}</span>
          </div>
          <div className="execution-row">
            <span className="dim">Product</span>
            <span className="execution-value-right">{execution.offer.product}</span>
          </div>
          <div className="execution-row">
            <span className="dim">Status</span>
            <span className={`status-badge status-${execution.status}`}>{STATUS_LABEL[execution.status]}</span>
          </div>
          <div className="execution-row">
            <span className="dim">Attempt</span>
            <span>
              {execution.attempt} / {execution.maxAttempts}
            </span>
          </div>
          {execution.error && (
            <div className="error-box">
              <span className="dim">Error</span>
              <span className="text-red">{execution.error}</span>
            </div>
          )}

          {execution.status === "awaiting_manual_auth" && (
            <div className="manual-auth-banner">
              Manual authentication required in the live browser window.
              <button className="btn btn-primary btn-small" onClick={onResume}>
                Resume
              </button>
            </div>
          )}

          {execution.purchaseResult?.voucher && (
            <div className="voucher-box">
              <div className="dim">Voucher code</div>
              <div className="voucher-code">{execution.purchaseResult.voucher.code}</div>
              {execution.purchaseResult.voucher.pin && (
                <div className="dim">PIN: {execution.purchaseResult.voucher.pin}</div>
              )}
              <button className="btn btn-small" onClick={onCopyVoucher}>
                Copy Voucher
              </button>
            </div>
          )}

          {(execution.status === "failed" || execution.status === "timed_out") && (
            <button className="btn btn-small" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
