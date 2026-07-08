/** Deterministic accent hue per connector id, purely for quick visual scanning in the offer table. */
export function connectorHue(connectorId: string): number {
  let hash = 0;
  for (let i = 0; i < connectorId.length; i++) {
    hash = (hash * 31 + connectorId.charCodeAt(i)) % 360;
  }
  return hash;
}
