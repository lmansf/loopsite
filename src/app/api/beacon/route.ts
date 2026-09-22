/**
 * src/app/api/beacon/route.ts — the engagement sink.
 *
 * Spec: design/05-build-spec.md §C.9, doc 03 §4.4.
 *
 * Logs and returns 204. No datastore, no cookies, no IP handling, no PII.
 * A beacon must never 500, so every failure is swallowed.
 */

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json();
    const parsed = body as { sid?: unknown; events?: unknown };
    if (Array.isArray(parsed?.events) && parsed.events.length <= 32) {
      console.log(
        JSON.stringify({ t: 'loop.beacon', sid: parsed.sid, events: parsed.events }),
      );
    }
  } catch {
    /* swallow — a beacon must never 500 */
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
