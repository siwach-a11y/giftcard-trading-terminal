export function LiveDemoBanner() {
  return (
    <div className="live-demo-banner">
      LIVE PUBLIC DEMO — this calls a real, shared, unauthenticated backend with only Eneba search implemented.
      Do not rely on it for real purchases; run <code>npm run dev</code> locally for that.
    </div>
  );
}
