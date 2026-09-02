'use server'
/** SPEC-M43 PRG-05 — the form door of the BOM→program proposal: one-click
 *  create through planProgram + runCommit (the SAME service as the
 *  create_program tool — ADR-001; proposal itself is the read service the
 *  propose_program_requirements tool shares). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planProgram } from '@/lib/erp/posting/program'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function createProgramFromProposalAction(fd: FormData): Promise<LifecycleActionResult> {
  const orderNo = String(fd.get('orderNo') ?? '').trim()
  const stage = String(fd.get('stage') ?? '').trim()
  const itemCode = String(fd.get('itemCode') ?? '').trim()
  const requiredKgs = Number(fd.get('requiredKgs') ?? 0)
  if (!orderNo || !stage || !itemCode) return { ok: false, text: 'Missing orderNo / stage / itemCode.' }
  if (!Number.isFinite(requiredKgs) || requiredKgs <= 0) return { ok: false, text: `Invalid requiredKgs: ${fd.get('requiredKgs')}` }

  const plan = await planProgram({
    orderNo,
    stage,
    ...(stage === 'knitting' ? { yarnCode: itemCode } : { fabricCode: itemCode }),
    requiredKgs,
    notes: `Proposed from BOM (${String(fd.get('proposalNote') ?? '').trim() || 'BOM × qty × wastage'})`,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: user?.email ?? 'system', actorSource: user ? 'form' : 'system', action: 'create', entity: 'program' })
  revalidatePath('/programs/propose')
  revalidatePath('/programs/new')
  revalidatePath('/programs/status')
  return { ok: true, text: `Program created — ${plan.summary}` }
}
