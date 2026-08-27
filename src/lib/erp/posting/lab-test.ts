/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-30 — create_lab_test service. LabTest row (ADR-015) — LT-####
// auto docNo. itemType+itemCode resolve the item master (pcs → Style by
// styleNo — the form's typed picker uses the 'style' master slug, so the
// service accepts BOTH 'pcs' and 'style'); lotNo/orderNo resolve to
// lot/order ids. Document-only — the QA lab log feeds /quality/lab-tests.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { LabTestInput } from '../schemas/lab-test'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory', pcs: 'style', style: 'style' }
const ID_FIELDS: Record<string, string> = { yarn: 'code', fabric: 'code', accessory: 'code', pcs: 'styleNo', style: 'styleNo' }
const TEST_TYPES = ['gsm', 'shrinkage', 'colour_fastness', 'composition', 'other']
const RESULTS = ['pending', 'pass', 'fail', 'conditional']

export async function planLabTest(args: LabTestInput): Promise<DocPlanResult> {
  const model = ITEM_MODELS[args.itemType]
  if (!model) return { ok: false, error: `itemType must be yarn | fabric | accessory | pcs (got '${args.itemType}')` }
  const item = await (db as any)[model].findUnique({ where: { [ID_FIELDS[args.itemType]]: args.itemCode } })
  if (!item) return { ok: false, error: `${args.itemType} ${args.itemCode} not found` }
  if (!TEST_TYPES.includes(args.testType)) {
    return { ok: false, error: `testType must be one of ${TEST_TYPES.join(' | ')} (got '${args.testType}')` }
  }
  const result = args.result?.trim() || 'pending'
  if (!RESULTS.includes(result)) {
    return { ok: false, error: `result must be one of ${RESULTS.join(' | ')} (got '${result}')` }
  }

  let lotId: string | undefined
  if (args.lotNo?.trim()) {
    const lot = await db.lot.findUnique({ where: { lotNo: args.lotNo.trim() } })
    if (!lot) return { ok: false, error: `Lot ${args.lotNo} not found` }
    lotId = lot.id
  }
  let orderId: string | undefined
  if (args.orderNo?.trim()) {
    const o = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
    if (!o) return { ok: false, error: `Order ${args.orderNo} not found` }
    orderId = o.id
  }

  const resolvedNo = await (async () => {
    const desired = args.testNo?.trim()
    if (desired) {
      const exists = await db.labTest.findUnique({ where: { testNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.labTest.findMany({ where: { testNo: { startsWith: 'LT-' } } })
    const used = new Set(all.map((t) => t.testNo))
    let n = 1
    while (used.has(`LT-${String(n).padStart(4, '0')}`)) n++
    return `LT-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed lab test ${resolvedNo} on ${args.itemType} ${args.itemCode} (${args.testType}) — ${result}.`,
    summary: `Create lab test ${resolvedNo} | ${args.testType} | ${args.itemType} ${args.itemCode} | result ${result}${lotId ? ` | lot ${args.lotNo}` : ''}`,
    creates: [
      { table: 'labTest', data: { testNo: resolvedNo, itemType: args.itemType, itemId: item.id, lotId, orderId, testType: args.testType, result, testedBy: args.testedBy, values: args.values, remarks: args.remarks } },
    ],
    sideEffects: ['Lab test appears in /quality/lab-tests'],
    async commit() {
      const t = await db.labTest.create({
        data: {
          testNo: resolvedNo, itemType: args.itemType, itemId: item.id, lotId, orderId,
          testType: args.testType, result,
          testedOn: args.testedOn ? new Date(args.testedOn) : new Date(),
          testedBy: args.testedBy, values: args.values, remarks: args.remarks,
        },
      })
      return { id: t.id, testNo: t.testNo }
    },
  }
}
