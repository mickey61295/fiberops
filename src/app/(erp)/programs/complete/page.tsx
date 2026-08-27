/**
 * /programs/complete — Complete Program (SPEC-M6 §2 row 18, legacy). Thin
 * screen over planCompleteProgram (balance ≤ 0 guard; force settles).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { LifecycleForm } from '@/components/erp/lifecycle-form'
import { completeProgramAction } from './actions'
import { Textarea } from '@/components/ui/textarea'

export const dynamic = 'force-dynamic'

export default async function CompleteProgramPage() {
  const open = await db.program.findMany({
    where: { status: { in: ['open', 'in_progress'] } },
    orderBy: { createdAt: 'desc' },
    take: 15,
  })
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/programs" className="hover:text-slate-800 hover:underline">Programs</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">Complete Program</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Complete Program</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Settle a program when achieved ≥ required (ledger-derived; force settles with a balance). Agent door:{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">complete_program</code>.
        </p>
      </div>

      <LifecycleForm action={completeProgramAction} label="Complete a program" docLabel="Program No" docPlaceholder="PGM-1001" submitLabel="Complete program">
        <div>
          <label className="text-xs text-slate-500">Note (optional)</label>
          <Textarea name="notes" rows={2} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <input type="checkbox" id="force" name="force" className="h-4 w-4" />
          <label htmlFor="force" className="text-xs text-slate-600">Force (settle with balance)</label>
        </div>
      </LifecycleForm>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              {['Program', 'Stage', 'Required', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {open.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-400">No open programs.</td></tr>
            ) : open.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-mono font-medium">{p.programNo}</td>
                <td className="px-3 py-2">{p.stage}</td>
                <td className="px-3 py-2">{p.requiredKgs} kg</td>
                <td className="px-3 py-2">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
