/**
 * /programs/propose — Propose from BOM (SPEC-M43 PRG-05, menu item
 * 'program-propose'). The BOM × order qty × wastage computation that
 * replaces hand-typed program requirements: enter (or link) an order → the
 * proposal table → one-click Create program per row (the SAME planProgram
 * service as the agent's create_program — ADR-001). The proposal itself is
 * the read service behind propose_program_requirements.
 */
import Link from 'next/link'
import { proposeProgramRequirements } from '@/lib/erp/registers/program-proposal'
import { ProposalRowForm } from './propose-forms'
import { createProgramFromProposalAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function ProposeProgramsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const orderNo = typeof sp.order === 'string' ? sp.order.trim() : ''
  const res = orderNo ? await proposeProgramRequirements(orderNo) : null
  const num = (n: number) => n.toLocaleString('en-IN')

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/programs/new" className="hover:text-slate-800 hover:underline">Programs</Link>
          <span>/</span>
          <span className="font-medium text-slate-700">Propose from BOM</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Propose programs from BOM</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Requirements computed as BOM qty × order pcs × (1 + boostupper% + reserveper%) — the agent&apos;s{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">propose_program_requirements</code> twin.
        </p>
      </div>

      {/* the order lookup — a plain GET form (?order=SO-…), zero JS */}
      <form method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4" data-testid="propose-order-form">
        <div>
          <label htmlFor="order" className="text-xs text-slate-500">Order No</label>
          <input
            id="order" name="order" defaultValue={orderNo} placeholder="SO-1001"
            className="h-9 w-44 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <button type="submit" className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
          Propose
        </button>
        {orderNo ? (
          <Link href={`/programs/new?order=${encodeURIComponent(orderNo)}`} className="text-xs text-slate-500 underline hover:text-slate-800">
            Open the program form prefilled instead →
          </Link>
        ) : null}
      </form>

      {!orderNo ? null : !res || !res.ok ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-testid="propose-error">
          {res && !res.ok ? res.error : `Order ${orderNo} not found`}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span data-testid="propose-summary">
              {res.proposal.styles.join(', ')} · {num(res.proposal.totalPcs)} pcs · wastage +{res.proposal.boostPct}% (boostupper + reserveper)
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" data-testid="propose-table">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Style</th>
                  <th className="px-3 py-2 text-right">Per pc</th>
                  <th className="px-3 py-2 text-right">Order pcs</th>
                  <th className="px-3 py-2 text-right">Wastage</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Create</th>
                </tr>
              </thead>
              <tbody>
                {res.proposal.rows.map((r, i) => (
                  <tr key={`${r.itemType}-${r.itemCode}-${i}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{r.itemCode}</td>
                    <td className="px-3 py-2">{r.stage === '—' ? 'accessory' : r.stage}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.styleNo}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.perPc}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.orderQty)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">+{r.boostPct}%</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{r.totalQty} {r.uom}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.rate ? `₹${r.rate}` : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <ProposalRowForm
                        action={createProgramFromProposalAction}
                        orderNo={res.proposal.orderNo}
                        stage={r.stage}
                        itemCode={r.itemCode}
                        requiredKgs={r.totalQty}
                        disabled={r.stage === '—'}
                        proposalNote={`${r.perPc}/pc × ${num(r.orderQty)} pcs × (1+${r.boostPct}%)`}
                        testId={`proposal-create-${r.itemCode}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-1 text-xs text-slate-500">
            {res.proposal.notes.map((n, i) => <li key={i}>· {n}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
