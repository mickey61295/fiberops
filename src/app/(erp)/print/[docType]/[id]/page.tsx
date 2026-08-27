/**
 * /print/[docType]/[id] — SPEC-M8 §3: ONE registry-driven print route for
 * every doc family (the DocScreen/config pattern, print edition). Resolves
 * the docType in PRINT_DOCS, the fetcher resolves by db id OR doc no, and
 * PrintSheet renders the A4 portrait sheet. ?copy= selects Original |
 * Duplicate | Triplicate (default Original); ?autoprint=0 = preview only.
 *
 * Route placement: under (erp) so the layout's fresh session + active-user
 * check runs; /print/* maps to no menu group → no rights pre-check
 * (printing is a read; the doc VIEW routes stay rights-gated by their
 * groups — SPEC-M8 §2).
 *
 * Print orientation: globals.css pins A4 LANDSCAPE for reports (M6-A); this
 * page inlines a later-cascade @page portrait so doc sheets print portrait
 * while report pages stay landscape.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PRINT_DOCS } from '@/lib/erp/print'
import type { PrintDoc } from '@/lib/erp/print/types'
import { PrintSheet } from '@/components/erp/print-sheet'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ docType: string; id: string }>
}): Promise<Metadata> {
  const { docType } = await params
  const fetcher = PRINT_DOCS[docType]
  if (!fetcher) return { title: 'Print — unknown document' }
  const doc = await fetcher((await params).id)
  return { title: doc ? `Print ${doc.docNo}` : 'Print — not found' }
}

const COPIES = new Set(['original', 'duplicate', 'triplicate'])

export default async function PrintDocPage({
  params,
  searchParams,
}: {
  params: Promise<{ docType: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { docType, id } = await params
  const { copy } = await searchParams
  const fetcher = PRINT_DOCS[docType]
  if (!fetcher) notFound()
  const doc = await fetcher(id)
  if (!doc) notFound()

  const copyRaw = Array.isArray(copy) ? copy[0] : copy
  const copyLabel = copyRaw && COPIES.has(copyRaw) ? copyRaw[0].toUpperCase() + copyRaw.slice(1) : 'Original'
  const withCopy: PrintDoc = { ...doc, copy: copyLabel }

  return (
    <>
      {/* A4 portrait for doc sheets — later cascade beats globals.css landscape */}
      <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>
      <PrintSheet doc={withCopy} />
    </>
  )
}
