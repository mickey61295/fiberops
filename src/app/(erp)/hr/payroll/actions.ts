'use server'
/** SPEC-M46 L-02 — form doors for the payroll run cycle (same services as
 * the create_payroll_run / commit_payroll_run tools, ADR-001). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planPayrollRun, planPayrollRunCommit } from '@/lib/erp/posting/payroll'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

async function commitPayrollPlan(plan: DocPlanResult, action: string): Promise<LifecycleActionResult> {
  if (!plan.ok) return { ok: false, text: plan.error }
  const _user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action, entity: 'payroll_run' })
  revalidatePath('/hr/payroll', 'layout') // covers the list AND the [id] view
  return { ok: true, text: `Done — ${plan.summary}` }
}

export async function createPayrollRunAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planPayrollRun({
    mode: String(fd.get('mode') ?? '').trim() as 'piece' | 'daily',
    from: String(fd.get('from') ?? '').trim(),
    to: String(fd.get('to') ?? '').trim(),
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  return commitPayrollPlan(plan, 'create')
}

export async function commitPayrollRunAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planPayrollRunCommit({
    runNo: String(fd.get('runNo') ?? '').trim(),
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  return commitPayrollPlan(plan, 'commit')
}
