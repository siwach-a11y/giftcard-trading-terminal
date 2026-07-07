import { TerminalEventMap } from "./events";

type Listener<K extends keyof TerminalEventMap> = (payload: TerminalEventMap[K]) => void;
type AnyListener = <K extends keyof TerminalEventMap>(event: K, payload: TerminalEventMap[K]) => void;

/**
 * Small typed pub/sub bus decoupling every core service from the logger and
 * the UI's live-update stream. Services publish domain events; the Logger
 * (see {@link ../logging/logger}) and any SSE/WebSocket bridge subscribe.
 */
export class EventBus {
  private listeners = new Map<keyof TerminalEventMap, Array<Listener<keyof TerminalEventMap>>>();
  private anyListeners: AnyListener[] = [];

  on<K extends keyof TerminalEventMap>(event: K, listener: Listener<K>): () => void {
    const bucket = this.listeners.get(event) ?? [];
    bucket.push(listener as Listener<keyof TerminalEventMap>);
    this.listeners.set(event, bucket);
    return () => this.off(event, listener);
  }

  off<K extends keyof TerminalEventMap>(event: K, listener: Listener<K>): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    const idx = bucket.indexOf(listener as Listener<keyof TerminalEventMap>);
    if (idx >= 0) bucket.splice(idx, 1);
  }

  /** Subscribes to every event, regardless of name. Used by the dashboard's live log stream. */
  onAny(listener: AnyListener): () => void {
    this.anyListeners.push(listener);
    return () => {
      const idx = this.anyListeners.indexOf(listener);
      if (idx >= 0) this.anyListeners.splice(idx, 1);
    };
  }

  emit<K extends keyof TerminalEventMap>(event: K, payload: TerminalEventMap[K]): void {
    const bucket = this.listeners.get(event);
    if (bucket) {
      for (const listener of [...bucket]) {
        listener(payload);
      }
    }
    for (const listener of [...this.anyListeners]) {
      listener(event, payload);
    }
  }
}

/** Process-wide bus. Core services all publish/subscribe through this instance. */
export const eventBus = new EventBus();
