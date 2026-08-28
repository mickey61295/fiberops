/**
 * Live tracker SSE stream (M9 Wave A): GET /api/live-tracker/stream →
 * text/event-stream pushing a full LiveSnapshot every TICK_MS.
 *
 * - Session-guarded (M7-B requireApiSession) — EventSource sends cookies
 *   same-origin, so the guard sees the fo_session cookie.
 * - Client disconnect (tab close / navigation) fires req.signal 'abort' →
 *   the interval is cleared and the stream closes (no leaked timers).
 * - A snapshot error mid-stream logs and keeps the stream alive — the next
 *   tick retries; the client's last good snapshot stays on screen.
 */
import { requireApiSession } from '@/lib/auth/api-guard'
import { collectLiveSnapshot } from '@/lib/erp/live-snapshot'

export const dynamic = 'force-dynamic'

const TICK_MS = 3000

export async function GET(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error

  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setInterval> | null = null
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch {
          // controller already closed — stop quietly
          closed = true
          if (timer) clearInterval(timer)
        }
      }

      const push = async () => {
        if (closed) return
        try {
          send(await collectLiveSnapshot())
        } catch {
          /* keep the stream alive; next tick retries */
        }
      }

      // Initial frame immediately, then on the tick.
      await push()
      timer = setInterval(push, TICK_MS)

      const cleanup = () => {
        if (closed) return
        closed = true
        if (timer) clearInterval(timer)
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
      req.signal.addEventListener('abort', cleanup)
    },
    cancel() {
      closed = true
      if (timer) clearInterval(timer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // proxies must not buffer the stream
    },
  })
}
