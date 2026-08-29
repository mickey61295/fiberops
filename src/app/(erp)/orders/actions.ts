'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M3 §8 (BOM note) + §9.2 — Order Hub server actions.
 * BOM lines are created through planBom — the SAME service the agent's
 * create_bom tool calls (ADR-001). Removal is a form-side direct delete:
 * there is no delete_bom_line tool in the §11 inventory, so this is a
 * DOCUMENTED single-door exception (P2 note in 01-STATE.md, revisit M5).
 */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { db } from '@/lib/db'
import { planBom } from '@/lib/erp/posting/bom'
import { BOM_SCHEMA } from '@/lib/erp/schemas/bom'

export type BomActionResult =
  | { ok: true; summary?: string }
  | { ok: false; errors: string[] }

export async function addBomLineAction(
  styleNo: string,
  itemType: string,
  itemCode: string,
  qty: number,
  rate?: number,
): Promise<BomActionResult> {
  const parsed = BOM_SCHEMA.safeParse({
    styleNo,
    lines: [{ itemType, itemCode, qty, rate: rate ?? undefined }],
  })
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
  }
  try {
    const plan = await planBom(parsed.data)
    if (!plan.ok) return { ok: false, errors: [plan.error] }
    const _user = await getSessionUser().catch(() => null)
    await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'bom', entity: 'bom' })
    try { revalidatePath('/orders') } catch { /* outside request scope (tests) */ }
    return { ok: true, summary: plan.summary }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}

export async function removeBomLineAction(id: string): Promise<BomActionResult> {
  // single-door exception — see file header note
  try {
    const line = await db.bomLine.findUnique({ where: { id } })
    if (!line) return { ok: false, errors: ['BOM line not found'] }
    await db.bomLine.delete({ where: { id } })
    try { revalidatePath('/orders') } catch { /* outside request scope (tests) */ }
    return { ok: true }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}
