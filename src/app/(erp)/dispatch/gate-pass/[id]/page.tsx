/**
 * /dispatch/gate-pass/[id] — Gate Pass view (SPEC-M5 §7-D-28). Renders the
 * shared GateEntryView card.
 */
import { GateEntryView } from '../../gate-view'

export const dynamic = 'force-dynamic'

export default async function GatePassViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GateEntryView id={id} backLabel="Gate Pass" backHref="/dispatch/gate-pass" />
}
