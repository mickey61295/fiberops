'use server'
/** SPEC-M6 §7-C-6 — form door for complete_program (same planCompleteProgram service). */
import { revalidatePath } from 'next/cache'
import { planCompleteProgram } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function completeProgramAction(fd: FormData): Promise<LifecycleActionResult> {
  const plan = await planCompleteProgram({
    programNo: String(fd.get('docNo') ?? '').trim(),
    force: fd.get('force') === 'on',
    notes: String(fd.get('notes') ?? '').trim() || undefined,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  await plan.commit()
  revalidatePath('/programs/complete')
  revalidatePath('/programs/status')
  return { ok: true, text: `Program completed — ${plan.summary}` }
}
