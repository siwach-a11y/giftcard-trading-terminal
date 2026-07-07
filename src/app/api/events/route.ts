import { container } from "@/config/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events bridge: every domain event published on the shared
 * {@link EventBus} (search progress, routing decisions, execution
 * lifecycle, errors, screenshots) is forwarded verbatim to the dashboard's
 * bottom Execution Log panel in real time.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      unsubscribe = container.eventBus.onAny((event, payload) => {
        const chunk = `event: ${event}\ndata: ${JSON.stringify({ event, payload, timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15000);
    },
    cancel() {
      unsubscribe();
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
