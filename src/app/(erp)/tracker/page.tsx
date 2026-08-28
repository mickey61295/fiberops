/**
 * /tracker route (SPEC-M9 §3) — the Live Operations Tracker.
 *
 * Server-fetches the FIRST snapshot so the screen renders content immediately
 * (no "Connecting…" flash); the LiveTracker client then takes over polling.
 * Rights: /tracker belongs to the `home` menu group (always allowed — ADR-018),
 * so the middleware pre-check + layout layer-2 effectively require only a
 * session. force-dynamic: the page shells a live poller; nothing here is
 * cacheable.
 */
import { LiveTracker } from '@/components/erp/live-tracker'
import { getTrackerSnapshot, type TrackerSnapshot } from '@/lib/erp/tracker'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let initial: TrackerSnapshot | null = null
  try {
    initial = await getTrackerSnapshot()
  } catch {
    initial = null // client falls back to its own fetch + error banner
  }
  return <LiveTracker initial={initial} />
}
