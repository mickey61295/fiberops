/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-26 — create_sample service. Sample row (ADR-015) — SMP-####
// auto docNo, buyer/style resolved by code (free FK cols, PITFALLS #21).
// Document-only (no stock) — the sample tracker feeds /orders/samples.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { SampleInput } from '../schemas/sample'

const SAMPLE_TYPES = ['proto', 'photo', 'counter', 'salesman', 'production']
const SAMPLE_STATUSES = ['submitted', 'approved', 'rejected', 'closed']

export async function planSample(args: SampleInput): Promise<DocPlanResult> {
  let buyerId: string | undefined
  if (args.buyerCode?.trim()) {
    const buyer = await db.buyer.findUnique({ where: { code: args.buyerCode.trim() } })
    if (!buyer) return { ok: false, error: `Buyer ${args.buyerCode} not found` }
    buyerId = buyer.id
  }
  let styleId: string | undefined
  if (args.styleCode?.trim()) {
    const style = await db.style.findUnique({ where: { styleNo: args.styleCode.trim() } })
    if (!style) return { ok: false, error: `Style ${args.styleCode} not found` }
    styleId = style.id
  }
  if (!SAMPLE_TYPES.includes(args.sampleType)) {
    return { ok: false, error: `sampleType must be one of ${SAMPLE_TYPES.join(' | ')} (got '${args.sampleType}')` }
  }
  const status = args.status?.trim() || 'submitted'
  if (!SAMPLE_STATUSES.includes(status)) {
    return { ok: false, error: `status must be one of ${SAMPLE_STATUSES.join(' | ')} (got '${status}')` }
  }

  const resolvedNo = await (async () => {
    const desired = args.sampleNo?.trim()
    if (desired) {
      const exists = await db.sample.findUnique({ where: { sampleNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.sample.findMany({ where: { sampleNo: { startsWith: 'SMP-' } } })
    const used = new Set(all.map((s) => s.sampleNo))
    let n = 1
    while (used.has(`SMP-${String(n).padStart(4, '0')}`)) n++
    return `SMP-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed sample ${resolvedNo} (${args.sampleType}) — ${args.qty ?? 0} pcs.`,
    summary: `Create sample ${resolvedNo} | ${args.sampleType} | qty ${args.qty ?? 0} | status ${status}${args.enquiryRef ? ` | ref ${args.enquiryRef}` : ''}`,
    creates: [
      { table: 'sample', data: { sampleNo: resolvedNo, buyerId, styleId, sampleType: args.sampleType, qty: args.qty ?? 0, status, enquiryRef: args.enquiryRef, remarks: args.remarks } },
    ],
    sideEffects: ['Sample appears in the Samples & Enquiry tracker (/orders/samples)'],
    async commit() {
      const s = await db.sample.create({
        data: {
          sampleNo: resolvedNo, buyerId, styleId, sampleType: args.sampleType,
          qty: args.qty ?? 0, sampledOn: args.sampledOn ? new Date(args.sampledOn) : new Date(),
          status, enquiryRef: args.enquiryRef, remarks: args.remarks,
        },
      })
      return { id: s.id, sampleNo: s.sampleNo }
    },
  }
}
