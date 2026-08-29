'use server'

/**
 * SPEC-M6 §7-B-2 — the menu-rights matrix save door. Calls the SAME
 * planMasterUpdate the update_user_group agent tool calls (ADR-001): rights
 * is a list field on the user-group config, so the matrix and the agent can
 * never drift. Role-based ROUTE GUARDING is a non-goal (§3-2) — this
 * persists + renders the matrix only.
 */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { getMasterConfig } from '@/lib/erp/master-configs'
import { planMasterUpdate } from '@/lib/erp/posting/master-service'

export type SaveRightsResult = { ok: true } | { ok: false; errors: string[] }

export async function saveMenuRightsAction(
  groupName: string,
  rights: string[],
): Promise<SaveRightsResult> {
  const config = getMasterConfig('user-group')
  if (!config) return { ok: false, errors: ['user-group config missing'] }
  try {
    const plan = await planMasterUpdate(config, { name: groupName, rights })
    if (!plan.ok) return { ok: false, errors: plan.errors }
    const _user = await getSessionUser().catch(() => null)
    await runCommit({ ok: plan.ok, commit: plan.commit, summary: plan.summary, creates: plan.creates ? [plan.creates] : undefined, updates: plan.updates ? [plan.updates] : undefined }, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'update', entity: 'userGroup' })
    revalidatePath('/admin/menu-rights')
    revalidatePath('/admin/users')
    return { ok: true }
  } catch (err) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}
