'use server'
/** SPEC-M43 PRG-03 — the spec-correction form door (the program view section):
 *  same planProgramSpecCorrection service as the correct_program_spec tool
 *  (ADR-001); runCommit stamps the AuditLog after-image. */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planProgramSpecCorrection } from '@/lib/erp/posting/program-spec'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function correctProgramSpecAction(fd: FormData): Promise<LifecycleActionResult> {
  const programNo = String(fd.get('programNo') ?? '').trim()
  const numOrU = (name: string) => {
    const raw = String(fd.get(name) ?? '').trim()
    return raw === '' ? undefined : Number(raw)
  }
  const strOrU = (name: string) => {
    const raw = String(fd.get(name) ?? '').trim()
    return raw === '' ? undefined : raw
  }
  const plan = await planProgramSpecCorrection({
    programNo,
    colourCode: strOrU('colourCode'),
    designCode: strOrU('designCode'),
    finDiaCode: strOrU('finDiaCode'),
    finGsm: numOrU('finGsm'),
    ll: strOrU('ll'),
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: user?.email ?? 'system', actorSource: user ? 'form' : 'system', action: 'correct-spec', entity: 'program' })
  revalidatePath(`/programs/${fd.get('programId') ?? ''}`)
  return { ok: true, text: `Spec corrected — ${plan.summary}` }
}
