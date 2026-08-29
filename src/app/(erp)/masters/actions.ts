'use server'

/**
 * SPEC-M2 §8.2 — the form door's server action.
 * Calls the SAME master-service functions the agent tools call (ADR-001),
 * so form saves and agent commits are behaviorally identical by construction.
 */
import { revalidatePath } from 'next/cache'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { planMasterCreate, planMasterUpdate } from '@/lib/erp/posting/master-service'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'

export type SaveMasterResult =
  | { ok: true; code?: string }
  | { ok: false; errors: string[] }

export async function saveMasterAction(
  slug: string,
  id: string | null,
  formData: FormData,
): Promise<SaveMasterResult> {
  const config = getMasterConfig(slug)
  if (!config) return { ok: false, errors: ['Unknown master'] }

  // FormData → raw record (checkboxes submit 'on'; normalize to 'true')
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue
    raw[key] = value === 'on' ? 'true' : value
  }

  try {
    const plan = id
      ? await planMasterUpdate(config, raw)
      : await planMasterCreate(config, raw)
    if (!plan.ok) return { ok: false, errors: plan.errors }
    // SPEC-M9 §9 M15 — audit choke point (form door for masters)
    const user = await getSessionUser().catch(() => null)
    const committed = await runCommit(
      { ok: true, commit: plan.commit, summary: plan.summary, creates: plan.creates ? [plan.creates] : undefined, updates: plan.updates ? [plan.updates] : undefined },
      { actorName: user?.email ?? 'system', actorSource: user ? 'form' : 'system', entity: config.model.toLowerCase(), action: id ? 'update' : 'create' },
    )

    revalidatePath('/masters')
    revalidatePath(`/masters/${slug}`)
    if (slug === 'fin-year') revalidatePath('/admin/company')
    // SPEC-M5 §9 — the shift master lives at /hr/shifts (not /masters/shift)
    if (slug === 'shift') revalidatePath('/hr/shifts')

    return { ok: true, code: committed.code }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}
