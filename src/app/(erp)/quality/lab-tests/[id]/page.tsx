/**
 * /quality/lab-tests/[id] — Lab Test view (SPEC-M5 §7-D-30). Header card
 * (item resolved per kind); values JSON pretty-printed when present.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

const MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style', style: 'style' }
const CODE_FIELDS: Record<string, string> = { yarn: 'code', fabric: 'code', accessory: 'code', pcs: 'styleNo', style: 'styleNo' }

export default async function LabTestViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const test = await db.labTest.findUnique({ where: { id } }).catch(() => null)
  if (!test) notFound()

  const model = MODELS[test.itemType] ?? 'style'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = await (db as any)[model].findUnique({ where: { [CODE_FIELDS[test.itemType] ?? 'styleNo']: test.itemId } }).catch(() => null)
  const lot = test.lotId ? await db.lot.findUnique({ where: { id: test.lotId } }).catch(() => null) : null
  const order = test.orderId ? await db.order.findUnique({ where: { id: test.orderId } }).catch(() => null) : null

  let valuesPretty = ''
  if (test.values) {
    try {
      valuesPretty = JSON.stringify(JSON.parse(test.values), null, 2)
    } catch {
      valuesPretty = test.values
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/quality/lab-tests" label="Lab Tests" title={`Lab Test · ${test.testNo}`} />
        <DocPrintLink docType="lab-test" id={test.testNo} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Test No</div>
            <div className="font-mono font-medium">{test.testNo}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Item</div>
            <div className="font-medium">{item ? `${item[CODE_FIELDS[test.itemType] ?? 'code'] ?? item.styleNo}` : '—'} <span className="text-slate-400">({test.itemType})</span></div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Test Type</div>
            <div className="font-medium capitalize">{test.testType.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Result</div>
            <div className="font-medium capitalize">{test.result}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Lot</div>
            <div className="font-medium">{lot?.lotNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Order</div>
            <div className="font-medium">{order?.orderNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Tested On</div>
            <div className="font-medium">{test.testedOn ? test.testedOn.toISOString().slice(0, 10) : '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Tested By</div>
            <div className="font-medium">{test.testedBy ?? '—'}</div>
          </div>
        </div>
        {test.remarks && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{test.remarks}</div>
        )}
      </div>
      {valuesPretty && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Parameter values</div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-slate-700">{valuesPretty}</pre>
        </div>
      )}
    </div>
  )
}
