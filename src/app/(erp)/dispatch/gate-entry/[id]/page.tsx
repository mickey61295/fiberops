/**
 * /dispatch/gate-entry/[id] — Gate Entry view (SPEC-M5 §7-D-27). Renders the
 * shared GateEntryView card.
 */
import { GateEntryView } from '../../gate-view'

export const dynamic = 'force-dynamic'

export default async function GateEntryViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GateEntryView id={id} backLabel="Gate Entry" backHref="/dispatch/gate-entry" />
}
