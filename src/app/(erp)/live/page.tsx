/**
 * Live tracker page (M9 Wave A) — the real-time companion of the parity
 * tracker (/parity). Server shell renders the FIRST snapshot server-side
 * (zero loading flash) and hands it to the client LiveTracker, which keeps
 * it fresh over SSE with polling fallback.
 *
 * Like /parity this is a meta/utility page: it maps to NO menu group
 * (findGroupForPath → undefined) so every authenticated user may open it.
 */
import { LiveStreamTracker } from '@/components/erp/live-stream-tracker'
import { collectLiveSnapshot } from '@/lib/erp/live-snapshot'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  const initial = await collectLiveSnapshot()
  return <LiveStreamTracker initial={initial} />
}
