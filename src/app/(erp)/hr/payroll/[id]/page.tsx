/**
 * /hr/payroll/[id] — the payroll run view (SPEC-M46 L-02). The lines table
 * (frozen at plan time), the commit door (draft → committed — posts one wage
 * journal per line with partyId), per-line payslip print links (committed
 * runs only — a draft payslip refuses, numbers must be posted), and the
 * posted-journals audit section. Same services as the commit_payroll_run tool.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { DocPrintLink } from '@/components/erp/doc-print-button'
import { PayrollForm } from '../payroll-forms'
import { commitPayrollRunAction } from '../actions'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-blue-100 text-blue-800',
  committed: 'bg-emerald-100 text-emerald-800',
}

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await db.payrollRun.findUnique({
    where: { id },
    include: { lines: { include: { employee: { include: { department: true } } } } },
  }).catch(() => null)
  if (!run) notFound()

  // party codes: PayrollLine.partyId is a plain column (PITFALLS #21) — resolve via lookup
  const partyIds = run.lines.map((l) => l.partyId).filter((p): p is string => !!p)
  const parties = partyIds.length
    ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, code: true } })
    : []
  const partyCodeById = new Map(parties.map((p) => [p.id, p.code]))

  // the posted journals (audit section — narration carries the run no)
  const journals = run.status === 'committed'
    ? await db.journal.findMany({
        where: { narration: { contains: `Payroll run ${run.runNo} ·` }, voucherType: 'journal' },
        orderBy: { voucherNo: 'asc' },
      }).catch(() => [])
    : []

  const totalEarned = run.lines.reduce((s, l) => s + l.earned, 0)
  const totalAdvances = run.lines.reduce((s, l) => s + l.advances, 0)
  const totalNet = run.lines.reduce((s, l) => s + l.net, 0)
  const statutory = run.statutory as any | null
  const anyDeducted = run.lines.some((l) => l.deductions > 0)
  const totalDeductions = run.lines.reduce((s, l) => s + l.deductions, 0)
  const totalPfEmployer = run.lines.reduce((s, l) => s + l.pfEmployer, 0)
  const totalEsiEmployer = run.lines.reduce((s, l) => s + l.esiEmployer, 0)
  // SPEC-M49 L-04 — the OT card/totals (0 on OT-off runs)
  const ot = run.ot as any | null
  const anyOt = run.lines.some((l) => l.otPay > 0)
  const totalOtPay = run.lines.reduce((s, l) => s + l.otPay, 0)
  const totalOtHours = Math.round(run.lines.reduce((s, l) => s + l.otHours, 0) * 100) / 100
  const period = `${run.from.toISOString().slice(0, 10)} → ${run.to.toISOString().slice(0, 10)}`

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/hr/payroll" className="hover:text-slate-800 hover:underline">Payroll</Link>
          <span>/</span>
          <span className="font-mono text-slate-700">{run.runNo}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Payroll run {run.runNo}</h1>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[run.status] ?? 'bg-slate-100 text-slate-700'}`}>{run.status}</span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          {run.mode === 'piece' ? 'Piece — Σ production-entry earnings' : 'Daily — weighted attendance × dailyWage'} · {period} · {run.lines.length} line{run.lines.length === 1 ? '' : 's'} ·
          earned ₹{Math.round(totalEarned).toLocaleString('en-IN')}{anyOt ? ` (incl. OT ₹${Math.round(totalOtPay).toLocaleString('en-IN')} — ${totalOtHours} h)` : ''} · advances ₹{Math.round(totalAdvances).toLocaleString('en-IN')}{anyDeducted ? ` · deductions ₹${Math.round(totalDeductions).toLocaleString('en-IN')}` : ''} · net ₹{Math.round(totalNet).toLocaleString('en-IN')}
          {run.committedAt ? ` · committed ${run.committedAt.toISOString().slice(0, 10)}` : ''}
        </p>
        {run.notes && <p className="text-xs text-slate-400 mt-1">{run.notes}</p>
        }
      </div>

      {statutory && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b bg-slate-50/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Statutory (SPEC-M48 L-03) — rates frozen on this run · <Link href="/hr/statutory" className="text-emerald-700 hover:underline">the remittance register</Link>
          </div>
          <div className="grid gap-3 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-slate-500">PF</div>
              <div className="font-mono">employee {statutory.pf?.employeePct ?? 0}% · employer {statutory.pf?.employerPct ?? 0}%{statutory.pf?.wageCeiling ? ` · wage ceiling ₹${statutory.pf.wageCeiling.toLocaleString('en-IN')}` : ''}</div>
            </div>
            <div>
              <div className="text-slate-500">ESI</div>
              <div className="font-mono">employee {statutory.esi?.employeePct ?? 0}% · employer {statutory.esi?.employerPct ?? 0}%{statutory.esi?.grossLimit ? ` · gross limit ₹${statutory.esi.grossLimit.toLocaleString('en-IN')}` : ''}</div>
            </div>
            <div>
              <div className="text-slate-500">PT / LWF</div>
              <div className="font-mono">{statutory.pt?.enabled ? `PT ₹${Number(statutory.pt.amount ?? 0).toLocaleString('en-IN')} ≥ ₹${Number(statutory.pt.grossThreshold ?? 0).toLocaleString('en-IN')}` : 'PT off'} · {statutory.lwf?.enabled ? `LWF ₹${Number(statutory.lwf.employee ?? 0).toLocaleString('en-IN')} + ₹${Number(statutory.lwf.employer ?? 0).toLocaleString('en-IN')} employer` : 'LWF off'}</div>
            </div>
            <div>
              <div className="text-slate-500">Totals</div>
              <div className="font-mono">deducted ₹{Math.round(totalDeductions).toLocaleString('en-IN')} · employer cost ₹{Math.round(totalPfEmployer + totalEsiEmployer).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}

      {ot && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b bg-slate-50/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Overtime (SPEC-M49 L-04) — multiplier + standard frozen on this run
          </div>
          <div className="grid gap-3 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-slate-500">Multiplier</div>
              <div className="font-mono">{ot.otMultiplier ?? 2}× the hourly rate</div>
            </div>
            <div>
              <div className="text-slate-500">Standard (no-shift fallback)</div>
              <div className="font-mono">{ot.standardHours ?? 8} h — a linked shift's own hours are that day's standard</div>
            </div>
            <div>
              <div className="text-slate-500">OT hours</div>
              <div className="font-mono">{totalOtHours} h — PRESENT days only</div>
            </div>
            <div>
              <div className="text-slate-500">OT pay</div>
              <div className="font-mono">₹{Math.round(totalOtPay).toLocaleString('en-IN')} (included in earned)</div>
            </div>
          </div>
        </div>
      )}

      {run.status === 'draft' && (
        <PayrollForm
          action={commitPayrollRunAction}
          submitLabel="Commit — post the wage journals"
          className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm"
          footerClassName="flex items-center gap-3 border-t border-amber-200 p-3"
          submitClassName="h-9 rounded-md bg-amber-700 px-4 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
          hint="One journal per line (Dr Production Wages | Staff Salaries / Cr Wage Payable, partyId stamped) — terminal."
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <input type="hidden" name="runNo" value={run.runNo} />
            <div>
              <label className="text-xs text-slate-500">Run</label>
              <div className="h-9 rounded-md border border-input bg-white/60 px-3 text-sm leading-9 font-mono">{run.runNo}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Commit notes (optional)</label>
              <input name="notes" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" placeholder="approved by owner" />
            </div>
          </div>
        </PayrollForm>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Employee', 'Dept', 'Basis', 'Party', 'Earned ₹', ...(anyOt ? ['OT ₹'] : []), 'Advances ₹', ...(anyDeducted ? ['Deducted ₹'] : []), 'Net ₹', 'Payslip'].map((h) => (
                <th key={h} className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${['Earned ₹', 'OT ₹', 'Advances ₹', 'Deducted ₹', 'Net ₹'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {run.lines.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-slate-500">{l.employee.code}</span>{' '}
                  <span className="font-medium">{l.employee.name}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{l.employee.department?.code ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">
                  {run.mode === 'piece'
                    ? `${l.qty ?? 0} pcs`
                    : `${l.days ?? 0} days${l.employee.dailyWage ? ` × ₹${l.employee.dailyWage}` : ''}`}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{l.partyId ? (partyCodeById.get(l.partyId) ?? '—') : '—'}</td>
                <td className="px-3 py-2 text-right font-mono">{l.earned.toLocaleString('en-IN')}</td>
                {anyOt && (
                  <td className="px-3 py-2 text-right font-mono text-slate-500">
                    {l.otPay ? (
                      <span title={`${l.otHours} h beyond the per-day standard (frozen on this run)`}>{Math.round(l.otPay).toLocaleString('en-IN')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-right font-mono text-slate-500">{l.advances ? l.advances.toLocaleString('en-IN') : '—'}</td>
                {anyDeducted && (
                  <td className="px-3 py-2 text-right font-mono text-slate-500">
                    {l.deductions ? (
                      <span title={`PF ${l.pf} · ESI ${l.esi} · PT ${l.pt} · LWF ${l.lwf}`}>{Math.round(l.deductions).toLocaleString('en-IN')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                <td className={`px-3 py-2 text-right font-mono font-medium ${l.net < 0 ? 'text-red-600' : ''}`}>{l.net.toLocaleString('en-IN')}{l.net < 0 ? ' (recoverable)' : ''}</td>
                <td className="px-3 py-2">
                  {run.status === 'committed' ? (
                    <DocPrintLink docType="payslip" id={l.id} label="Payslip" />
                  ) : (
                    <span className="text-xs text-slate-400">after commit</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-slate-50/80 font-medium">
              <td className="px-3 py-2" colSpan={4}>Totals — {run.lines.length} lines</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(totalEarned).toLocaleString('en-IN')}</td>
              {anyOt && <td className="px-3 py-2 text-right font-mono text-slate-500">{Math.round(totalOtPay).toLocaleString('en-IN')}</td>}
              <td className="px-3 py-2 text-right font-mono text-slate-500">{Math.round(totalAdvances).toLocaleString('en-IN')}</td>
              {anyDeducted && <td className="px-3 py-2 text-right font-mono text-slate-500">{Math.round(totalDeductions).toLocaleString('en-IN')}</td>}
              <td className="px-3 py-2 text-right font-mono">{Math.round(totalNet).toLocaleString('en-IN')}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {journals.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <div className="border-b bg-slate-50/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Posted wage journals ({journals.length}) — Dr {run.mode === 'piece' ? 'Production Wages' : 'Staff Salaries'} / Cr {run.statutory ? 'Wage Payable + statutory payables' : 'Wage Payable'}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/80">
                {['Voucher', 'Date', 'Amount ₹', 'FY', 'Narration'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-mono font-medium">{j.voucherNo}</td>
                  <td className="px-3 py-2 text-slate-500">{j.date.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2 font-mono">{j.amount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-slate-500">{j.finYear}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{j.narration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Lines froze at run creation (employee, party, days/qty, money{statutory ? ', statutory rates' : ''}{ot ? ', OT multiplier + standard hours' : ''}) — later attendance, payment or rate edits do not move a drafted run.
        {run.status === 'committed'
          ? ' Pay the net via Wage Payments (pay_wages) — the employee-party ledger closes to exactly 0.' + (statutory ? ' Remit the statutory shares via payments to the authority parties (EPFO/ESIC/…) — /hr/statutory shows the pending per authority.' : '')
          : ' Committing posts the wage journals and makes the run terminal.'}
      </p>
    </div>
  )
}
