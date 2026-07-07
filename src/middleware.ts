import { NextRequest, NextResponse } from "next/server";

/**
 * Only relevant when this app is deployed as a public backend for the
 * static demo (see docs/ARCHITECTURE.md "Public demo backend"). A
 * same-origin/local deployment (`npm run dev`, a private server) never hits
 * a cross-origin request and the rate limit is generous enough to be a
 * no-op in normal personal use.
 */
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean)
);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

// Module-level state persists across requests within one running server
// process (true for this app's actual deployment target, a single Node
// process on Cloud Run) — not a distributed limiter, just a cheap backstop
// against one client hammering a public, unauthenticated demo backend.
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(clientId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(clientId, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : Array.from(ALLOWED_ORIGINS)[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin ?? "null",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (ALLOWED_ORIGINS.size > 0 && isRateLimited(clientId)) {
    return NextResponse.json({ error: "Too many requests — try again shortly." }, { status: 429, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
