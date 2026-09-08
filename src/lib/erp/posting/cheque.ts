/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M56 (PAY-08, §17-3 ADR-020) — the cheque lifecycle doors (PDC-03/04).
//
// The doctrine (02-DECISIONS ADR-020): chequeStatus is a PHYSICAL layer,
// never a GL layer. The bank GL leg posts at voucher time (the M51
// doctrine — the voucher IS the money-document), so:
//   · CLEAR  = the bank's physical confirmation — a stamp, NO journal
//     (the money moved once, at the voucher), NO allocation change.
//   · BOUNCE = the money never arrived — the M40 cancel machinery is
//     EXACTLY the reversal (CN- contra with legs + FKs swapped, allocations
//     reversedAt, invoice/bill statuses re-derived), plus the 'bounced'
//     stamp, all in ONE transaction (buildPaymentCancelPlan).
//
// Guards are LOUD everywhere (the deptCode discipline): non-cheque modes,
// already-cleared, already-bounced, cancelled payments, unknown vouchers all
// refuse with named guidance — no silent transitions. Pre-M56 cheque rows
// (chequeStatus null, journey untracked) are accepted: stamping one now is
// the honest end-of-journey, never a fabricated history.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { ChequeClearInput, ChequeBounceInput } from '../schemas/cancel'
import { buildPaymentCancelPlan } from './cancel'

function isoDay(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : ''
}

// ───────────── PDC-03 — the clear door (physical confirmation) ─────────────

export async function planChequeClear(args: ChequeClearInput): Promise<DocPlanResult> {
  const pay = await db.payment.findUnique({ where: { voucherNo: args.voucherNo } })
  if (!pay) return { ok: false, error: `Payment ${args.voucherNo} not found` }
  if (pay.mode !== 'cheque') {
    return { ok: false, error: `${pay.voucherNo} is mode '${pay.mode}' — the cheque lifecycle applies only to cheque-mode vouchers. Record a cheque payment first (mode=cheque, the cheque no in reference)` }
  }
  if (pay.chequeStatus === 'cleared') {
    return { ok: false, error: `Cheque ${pay.reference ?? pay.voucherNo} (${pay.voucherNo}) is already CLEARED (bank confirmed ${isoDay(pay.clearedAt)}) — there is no further transition` }
  }
  if (pay.chequeStatus === 'bounced') {
    return { ok: false, error: `Cheque ${pay.reference ?? pay.voucherNo} (${pay.voucherNo}) BOUNCED — the money never arrived (contra CN-${pay.voucherNo} reversed it). Issue a new payment for the amount instead of clearing` }
  }
  if (pay.status !== 'active') {
    return { ok: false, error: `Payment ${pay.voucherNo} is cancelled — its cheque journey is moot (the contra CN-${pay.voucherNo} already reversed the money). Clearing is not available` }
  }

  let clearedOn = new Date()
  if (args.clearedOn) {
    clearedOn = new Date(args.clearedOn)
    if (Number.isNaN(clearedOn.getTime())) {
      return { ok: false, error: `Invalid clearedOn "${args.clearedOn}" — pass an ISO date (YYYY-MM-DD)` }
    }
  }
  const preM56 = pay.chequeStatus === null

  return {
    ok: true,
    text: `Proposed CLEARING of cheque ${pay.reference ?? pay.voucherNo} (${pay.voucherNo}, ₹${pay.amount}${pay.chequeDate ? `, dated ${isoDay(pay.chequeDate)}` : ''}) — bank confirmation on ${isoDay(clearedOn)}. Physical confirmation only: the GL bank leg posted at voucher time, so NO journal moves.`,
    summary: `Clear cheque | ${pay.voucherNo} | ₹${pay.amount} | confirmed ${isoDay(clearedOn)}${preM56 ? ' | pre-M56 row (journey was untracked — stamped now)' : ''}`,
    creates: [],
    updates: [
      { table: 'payment', id: pay.id, data: { chequeStatus: 'cleared', clearedAt: clearedOn } },
    ],
    sideEffects: [
      `Cheque ${pay.reference ?? pay.voucherNo} stamped CLEARED — it leaves the /accounts/pdc PDC register (the journey is over)`,
      'NO journal: the bank GL leg posted at voucher time (the M51 doctrine) — clearing is the physical confirmation',
      'Allocations + invoice/bill statuses untouched (the money was real the moment the voucher posted)',
      ...(preM56 ? ['Pre-M56 cheque row (chequeStatus was null — the journey was untracked); the stamp ends it honestly, never fabricates a history'] : []),
      ...(args.notes ? [`Notes: ${args.notes}`] : []),
    ],
    async commit() {
      await db.payment.update({ where: { id: pay.id }, data: { chequeStatus: 'cleared', clearedAt: clearedOn } })
      return { id: pay.id, voucherNo: pay.voucherNo, chequeStatus: 'cleared', clearedAt: clearedOn }
    },
  }
}

// ───────────── PDC-04 — the bounce door (the M40 cancel + the stamp) ─────────────

export async function planChequeBounce(args: ChequeBounceInput): Promise<DocPlanResult> {
  const pay = await db.payment.findUnique({ where: { voucherNo: args.voucherNo } })
  if (!pay) return { ok: false, error: `Payment ${args.voucherNo} not found` }
  if (pay.mode !== 'cheque') {
    return { ok: false, error: `${pay.voucherNo} is mode '${pay.mode}' — the cheque lifecycle applies only to cheque-mode vouchers. Record a cheque payment first (mode=cheque, the cheque no in reference)` }
  }
  if (pay.chequeStatus === 'cleared') {
    return { ok: false, error: `Cheque ${pay.reference ?? pay.voucherNo} (${pay.voucherNo}) was CLEARED on ${isoDay(pay.clearedAt)} — the money arrived. If it was cleared in error, reverse the payment via cancel_payment instead` }
  }
  if (pay.chequeStatus === 'bounced') {
    return { ok: false, error: `Cheque ${pay.reference ?? pay.voucherNo} (${pay.voucherNo}) is already BOUNCED — the contra CN-${pay.voucherNo} reversed it. Nothing further to do here` }
  }
  if (pay.status !== 'active') {
    return { ok: false, error: `Payment ${pay.voucherNo} is already cancelled — the PAY-06 cancel door (cancel_payment) reversed it via CN-${pay.voucherNo}; no cheque journey remains` }
  }

  // The shared core does the rest: contra + allocation reversal + status
  // re-derivation + the 'bounced' stamp, in one transaction.
  return buildPaymentCancelPlan(pay, args, { chequeBounce: true })
}
