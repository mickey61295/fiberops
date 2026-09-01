'use server'
/** SPEC-M42 INV-01 — form doors for the stock take cycle (same services as
 *  the create_stock_take / record_stock_counts / advance_stock_take tools). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planStockTake, planStockTakeCount, planStockTakeAdvance } from '@/lib/erp/posting/stock-take'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

async function commitTakePlan(plan: DocPlanResult, action: string): Promise<LifecycleActionResult> {
  if (!plan.ok) return { ok: false, text: plan.error }
  const _user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action, entity: 'stock_take' })
  revalidatePath('/inventory/stock-take', 'layout') // covers the list AND the [id] view
  return { ok: true, text: `Done — ${plan.summary}` }
}

export async function createStockTakeAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planStockTake({
    godownCode: String(fd.get('docNo') ?? '').trim(), // LifecycleForm's doc input IS the godown code
    itemType: String(fd.get('itemType') ?? '').trim() || undefined,
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  return commitTakePlan(plan, 'create')
}

/** The count grid: rows post `kgs.<lineId>` / `mtrs.<lineId>` / … inputs +
 *  hidden `code.<lineId>` + `type.<lineId>` (the page resolves codes once). */
export async function recordCountsAction(fd: FormData): Promise<LifecycleActionResult> {
  const takeNo = String(fd.get('takeNo') ?? '').trim()
  const byRow = new Map<string, { itemType: string; itemCode: string; kgs?: number; mtrs?: number; pcs?: number; bags?: number }>()
  for (const [name, raw] of fd.entries()) {
    const m = /^(kgs|mtrs|pcs|bags|code|type)\.(.+)$/.exec(name)
    if (!m) continue
    const [, field, lineId] = m
    const val = String(raw).trim()
    if (field === 'code' || field === 'type') {
      const row = byRow.get(lineId) ?? { itemType: '', itemCode: '' }
      if (field === 'code') row.itemCode = val
      else row.itemType = val
      byRow.set(lineId, row)
    } else if (val !== '') {
      const n = Number(val)
      if (!Number.isFinite(n) || n < 0) return { ok: false, text: `Invalid ${field} value '${val}' — counts must be non-negative numbers` }
      const row = byRow.get(lineId) ?? { itemType: '', itemCode: '' }
      if (field === 'kgs') row.kgs = n
      else if (field === 'mtrs') row.mtrs = n
      else if (field === 'pcs') row.pcs = n
      else row.bags = n
      byRow.set(lineId, row)
    }
  }
  const lines = [...byRow.values()].filter((r) => r.itemType && r.itemCode && (r.kgs != null || r.mtrs != null || r.pcs != null || r.bags != null))
  if (!lines.length) return { ok: false, text: 'No counts entered — fill at least one row' }
  const plan = await planStockTakeCount({ takeNo, lines })
  return commitTakePlan(plan, 'count')
}

export async function advanceStockTakeAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planStockTakeAdvance({
    takeNo: String(fd.get('takeNo') ?? '').trim(),
    to: String(fd.get('to') ?? '').trim(),
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  return commitTakePlan(plan, 'advance')
}
