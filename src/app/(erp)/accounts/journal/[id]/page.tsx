/**
 * /accounts/journal/[id] — Journal voucher view (SPEC-M3 §8 row 17 view mode).
 * Resolves by db id OR voucherNo. Not a chain stage — no chain bar state.
 * SPEC-M50 M-01 — the GL-legs line under the breadcrumb names the resolved
 * CoA codes (the voucher's own strings stay the detail text).
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { journalConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function JournalViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { party: true, debitAccountRef: true, creditAccountRef: true }
  let j = await db.journal.findUnique({ where: { id }, include }).catch(() => null)
  if (!j) j = await db.journal.findUnique({ where: { voucherNo: id }, include })
  if (!j) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    voucherNo: j.voucherNo,
    voucherType: j.voucherType,
    debitAccount: j.debitAccount,
    creditAccount: j.creditAccount,
    amount: j.amount,
    partyCode: j.party?.code ?? '',
    date: d(j.date),
    narration: j.narration ?? '',
  }
  const legs = j.debitAccountRef || j.creditAccountRef
    ? `GL legs: Dr ${j.debitAccount}${j.debitAccountRef ? ` [${j.debitAccountRef.code}]` : ' (unlinked)'} / Cr ${j.creditAccount}${j.creditAccountRef ? ` [${j.creditAccountRef.code}]` : ' (unlinked)'} — the chart of accounts (SPEC-M50)`
    : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/accounts/journal" label="Journal" title={j.voucherNo} />
        <DocPrintLink docType="journal" id={j.voucherNo} />
      </div>
      {legs ? <p className="text-xs text-muted-foreground font-mono">{legs}</p> : null}
      <DocScreen
        config={toScreenConfig(journalConfig)}
        mode="view"
        docNo={j.voucherNo}
        initial={initial}
      />
    </div>
  )
}
