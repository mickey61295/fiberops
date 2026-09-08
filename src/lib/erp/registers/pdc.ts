/**
 * PDC register service — SPEC-M56 §2 PDC-05 (PAY-08, §17-3 ADR-020).
 * The cheques-in-the-field lens: every cheque-mode payment that is still
 * ISSUED and active — post-dated or not — one row per cheque, aging off
 * the cheque's own date:
 *   · Type PDC  = chequeDate after the voucher date (post-dated at issue)
 *   · OVERDUE   = chequeDate before today and still not cleared/bounced
 * Cleared cheques leave (journey over); bounced cheques leave (reversed,
 * cancelled); non-cheque modes never appear (no journey). Pre-M56 cheque
 * rows (chequeStatus null) are honestly ABSENT — their journey was never
 * tracked, and the register never fabricates history. The
 * get_pdc_register tool delegates here; /accounts/pdc is the screen.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

function istDay(d: Date): number {
  // IST day-floor (UTC+5:30) — the register's "today" matches the app's
  // IST day-boundary discipline (SPEC-M37 OPS-03).
  return Math.floor((d.getTime() + 5.5 * 3600_000) / 86_400_000)
}

export async function queryPdc(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { mode: 'cheque', chequeStatus: 'issued', status: 'active' }
  if (q.direction && (q.direction === 'in' || q.direction === 'out')) {
    where.direction = q.direction
  }
  if (q.q) {
    const parties = await db.party.findMany({
      where: { OR: [{ code: { contains: q.q } }, { name: { contains: q.q } }] },
      select: { id: true },
    })
    if (parties.length === 0) return { rows: [], summary: `No party matches "${q.q}"`, count: 0 }
    where.partyId = { in: parties.map((p) => p.id) }
  }
  if (q.from || q.to) {
    // A date window filters on the cheque's OWN date; rows without one
    // (journey date unknown) are honestly excluded from a dated window.
    where.chequeDate = {}
    if (q.from) where.chequeDate.gte = q.from
    if (q.to) where.chequeDate.lte = q.to
  }

  const pays = await db.payment.findMany({
    where,
    include: { party: { select: { code: true, name: true } } },
    take: 5000,
  })

  const today = istDay(new Date())
  const all = pays
    .map((p) => {
      const chequeDay = p.chequeDate ? istDay(p.chequeDate) : null
      const overdueDays = chequeDay === null ? null : today - chequeDay
      const due =
        overdueDays === null
          ? '—'
          : overdueDays < 0
            ? `due in ${-overdueDays} d`
            : overdueDays === 0
              ? 'DUE TODAY'
              : `OVERDUE ${overdueDays} d`
      return {
        id: p.id,
        href: `/accounts/payments/${p.id}`,
        voucherNo: p.voucherNo,
        direction: p.direction,
        party: p.party ? `${p.party.code} · ${p.party.name}` : '—',
        amount: p.amount,
        reference: p.reference ?? '—',
        payDate: new Date(p.payDate).toISOString().slice(0, 10),
        chequeDate: p.chequeDate ? new Date(p.chequeDate).toISOString().slice(0, 10) : '—',
        type: p.chequeDate ? (p.chequeDate.getTime() > p.payDate.getTime() ? 'PDC' : 'cheque') : '—',
        due,
        overdueDays,
      }
    })
    // soonest-due first (the risk lens); undated rows last, then voucher no
    .sort((a, b) => {
      const ad = a.overdueDays ?? Number.MAX_SAFE_INTEGER
      const bd = b.overdueDays ?? Number.MAX_SAFE_INTEGER
      if (ad !== bd) return ad - bd
      return a.voucherNo.localeCompare(b.voucherNo)
    })

  const count = all.length
  const start = (q.page - 1) * q.limit
  const rows: RegisterRow[] = all.slice(start, start + q.limit).map((r) => ({ ...r }))

  const amount = all.reduce((s, r) => s + r.amount, 0)
  const overdue = all.filter((r) => (r.overdueDays ?? -1) > 0).reduce((s, r) => s + r.amount, 0)
  const pdcCount = all.filter((r) => r.type === 'PDC').length
  return {
    rows,
    totals: [
      { label: 'Cheques', value: count },
      { label: 'Amount (₹)', value: Math.round(amount) },
      { label: 'Overdue (₹)', value: Math.round(overdue) },
    ],
    summary: `${count} cheque${count === 1 ? '' : 's'} in the field (${pdcCount} post-dated) · ₹${Math.round(amount).toLocaleString('en-IN')} outstanding${overdue > 0 ? ` · ₹${Math.round(overdue).toLocaleString('en-IN')} OVERDUE` : ''} — clears leave, bounces reverse via CN-`,
    count,
  }
}
