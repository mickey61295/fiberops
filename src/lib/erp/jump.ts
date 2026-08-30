/**
 * SPEC-M29 — the doc-number jump resolver (gap-audit §7-G: "type '1042' or
 * 'SO-1042' → jump to doc"). A 12-family table over the daily-use doc
 * families; a bare digit run searches every family, a prefixed query
 * targets its family first. Hrefs carry REAL db ids.
 */
import { db } from '@/lib/db'

export interface JumpFamily {
  slug: string
  label: string
  model: keyof typeof db
  numberField: string
  viewRoute: (id: string) => string
}

export const JUMP_FAMILIES: JumpFamily[] = [
  { slug: 'order', label: 'Order', model: 'order', numberField: 'orderNo', viewRoute: (id) => `/orders/${id}` },
  { slug: 'purchase-order', label: 'Purchase Order', model: 'purchaseOrder', numberField: 'poNo', viewRoute: (id) => `/procurement/po/${id}` },
  { slug: 'grn', label: 'GRN', model: 'gRN', numberField: 'grnNo', viewRoute: (id) => `/procurement/grn/${id}` },
  { slug: 'invoice', label: 'Sales Invoice', model: 'salesInvoice', numberField: 'invoiceNo', viewRoute: (id) => `/accounts/invoice/${id}` },
  { slug: 'despatch', label: 'Pcs DC (Despatch)', model: 'pcsDespatch', numberField: 'dcNo', viewRoute: (id) => `/pieces/despatch/${id}` },
  { slug: 'cut', label: 'Cut Order', model: 'cutOrder', numberField: 'cutNo', viewRoute: (id) => `/cutting/job-order/${id}` },
  { slug: 'jobwork', label: 'Jobwork Order', model: 'jobworkOrder', numberField: 'dcNo', viewRoute: (id) => `/jobwork/order/${id}` },
  { slug: 'journal', label: 'Journal', model: 'journal', numberField: 'voucherNo', viewRoute: (id) => `/accounts/journal/${id}` },
  { slug: 'payment', label: 'Payment', model: 'payment', numberField: 'voucherNo', viewRoute: (id) => `/accounts/payments/${id}` },
  { slug: 'debit-note', label: 'Debit Note', model: 'debitNote', numberField: 'noteNo', viewRoute: (id) => `/accounts/debit-note/${id}` },
  { slug: 'program', label: 'Program', model: 'program', numberField: 'programNo', viewRoute: (id) => `/programs/${id}` },
  { slug: 'sample', label: 'Sample', model: 'sample', numberField: 'sampleNo', viewRoute: (id) => `/orders/samples/${id}` },
]

export interface JumpResult {
  family: string
  label: string
  docNo: string
  href: string
}

const LIMIT = 8

/**
 * Resolve a jump query. A bare digit run ("1042") searches every family's
 * number field; a prefixed query ("SO-1042") hits its exact family first.
 * Ordering: exact-equals → startsWith → contains; capped at 8.
 */
export async function resolveJump(qRaw: string): Promise<JumpResult[]> {
  const q = qRaw.trim()
  if (q.length < 2) return []
  const out: (JumpResult & { _rank: number })[] = []

  for (const fam of JUMP_FAMILIES) {
    // The number field is a @unique string column — a safe where-clause key.
    const table = (db as any)[fam.model]
    if (!table?.findMany) continue
    const rows: Array<{ id: string } & Record<string, unknown>> = await table.findMany({
      where: { [fam.numberField]: { contains: q } },
      take: LIMIT,
    })
    for (const r of rows) {
      const docNo = String(r[fam.numberField] ?? '')
      let rank = 2 // contains
      if (docNo === q) rank = 0
      else if (docNo.startsWith(q)) rank = 1
      out.push({ family: fam.slug, label: fam.label, docNo, href: fam.viewRoute(r.id), _rank: rank })
    }
  }
  return out
    .sort((a, b) => a._rank - b._rank || a.docNo.localeCompare(b.docNo))
    .slice(0, LIMIT)
    .map(({ _rank, ...r }) => r)
}
