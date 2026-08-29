'use server'
/** SPEC-M6 §7-C-6 — form door for complete_program (same planCompleteProgram service). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planCompleteProgram } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function completeProgramAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planCompleteProgram({
    programNo: String(fd.get('docNo') ?? '').trim(),
    force: fd.get('force') === 'on',
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const _user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'complete', entity: 'program' })
  revalidatePath('/programs/complete')
  revalidatePath('/programs/status')
  return { ok: true, text: `Program completed — ${plan.summary}` }
}
