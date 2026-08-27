'use server'
/** SPEC-M6 §7-C-6 — form door for cancel_program (same planCancelProgram service). */
import { revalidatePath } from 'next/cache'
import { planCancelProgram } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function cancelProgramAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planCancelProgram({
    programNo: String(fd.get('docNo') ?? '').trim(),
    force: fd.get('force') === 'on',
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  await plan.commit()
  revalidatePath('/programs/cancel')
  revalidatePath('/programs/status')
  return { ok: true, text: `Program cancelled — ${plan.summary}` }
}
