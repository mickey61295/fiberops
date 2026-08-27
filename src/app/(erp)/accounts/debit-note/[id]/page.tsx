/**
 * /accounts/debit-note/[id] — Debit Note view (SPEC-M3 §8 row 15 view mode).
 * Resolves by db id OR noteNo. Not a chain stage — no chain bar state.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { debitNoteConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function DebitNoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { party: true }
  let note = await db.debitNote.findUnique({ where: { id }, include }).catch(() => null)
  if (!note) note = await db.debitNote.findUnique({ where: { noteNo: id }, include })
  if (!note) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    noteNo: note.noteNo,
    noteType: note.noteType,
    partyCode: note.party?.code ?? '',
    amount: note.amount,
    date: d(note.date),
    reason: note.reason ?? '',
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/accounts/debit-note" label="Debit Notes" title={note.noteNo} />
        <DocPrintLink docType="debit-note" id={note.noteNo} />
      </div>
      <DocScreen
        config={toScreenConfig(debitNoteConfig)}
        mode="view"
        docNo={note.noteNo}
        initial={initial}
      />
      <div className="text-xs text-slate-500">
        Party{' '}
        <Link href="/masters/party" className="font-mono text-emerald-700 hover:underline">{note.party?.code}</Link>
        {note.party ? ` · ${note.party.name}` : ''} · status {note.status} · ₹{(note.amount || 0).toLocaleString('en-IN')} debit
      </div>
    </div>
  )
}
