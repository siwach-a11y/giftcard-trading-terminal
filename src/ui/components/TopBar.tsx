interface Props {
  connectorCount: number;
}

export function TopBar({ connectorCount }: Props) {
  return (
    <div className="top-bar">
      <div className="top-bar-brand">
        <span className="top-bar-mark">◆</span>
        GIFT CARD TRADING TERMINAL
      </div>
      <div className="top-bar-meta">
        <span className="top-bar-pill">{connectorCount} connector{connectorCount === 1 ? "" : "s"}</span>
        <span className="top-bar-pill top-bar-pill-dim">single operator · no customers</span>
      </div>
    </div>
  );
}
