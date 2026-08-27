/**
 * Shared GateEntry view card (SPEC-M5 §7-D-27/28) — used by both
 * /dispatch/gate-entry/[id] and /dispatch/gate-pass/[id] (ONE model; the
 * two routes are the §4 rule-2 variants).
 */
import Link from 'next/link'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export async function GateEntryView({ id, backLabel, backHref }: { id: string; backLabel: string; backHref: string }) {
  const entry = await db.gateEntry.findUnique({ where: { id } }).catch(() => null)
  if (!entry) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Gate record not found.
      </div>
    )
  }
  const party = entry.partyId ? await db.party.findUnique({ where: { id: entry.partyId } }).catch(() => null) : null
  const isIn = entry.gateType === 'in'

  return (
    <div className="space-y-5">
      <DocBreadcrumb href={backHref} label={backLabel} title={`${isIn ? 'Gate Entry' : 'Gate Pass'} · ${entry.entryNo}`} />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{isIn ? 'Entry No' : 'Pass No'}</div>
            <div className="font-mono font-medium">{entry.entryNo}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Direction</div>
            <div className="font-medium uppercase">{entry.gateType === 'in' ? 'IN' : 'OUT'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">When</div>
            <div className="font-medium">{entry.gateDateTime ? entry.gateDateTime.toISOString().replace('T', ' ').slice(0, 16) : '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <div className="font-medium capitalize">{entry.status}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Vehicle</div>
            <div className="font-medium">{entry.vehicleNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Party</div>
            <div className="font-medium">{party?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Ref Doc</div>
            <div className="font-medium">{entry.refDocNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Logged</div>
            <div className="font-medium">{entry.createdAt ? entry.createdAt.toISOString().slice(0, 10) : '—'}</div>
          </div>
        </div>
        {entry.purpose && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{entry.purpose}</div>
        )}
        <div className="mt-4 text-sm">
          <Link href={backHref} className="text-emerald-700 hover:underline">
            ← Back to the {isIn ? 'gate entry' : 'gate pass'} log
          </Link>
        </div>
      </div>
    </div>
  )
}
