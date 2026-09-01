'use server'
/** SPEC-M41 PRC-05 — the DC lifecycle form door (same planDcTransition service
 *  as the deliver_dc agent tool — ADR-001). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planDcTransition } from '@/lib/erp/posting/lifecycle'

export async function dcTransitionAction(dcNo: string, to: 'despatched' | 'delivered'): Promise<{ ok: boolean; text: string }> {
  const plan = await planDcTransition({ dcNo: dcNo.trim(), to })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const user = await getSessionUser().catch(() => null)
  const result = await runCommit(plan, {
    actorName: user?.email ?? 'system',
    actorSource: user ? 'form' : 'system',
    action: to === 'delivered' ? 'deliver' : 'convert',
    entity: 'pcs_despatch',
  })
  revalidatePath('/dispatch/register')
  revalidatePath(`/pieces/despatch/${dcNo.trim()}`)
  return { ok: true, text: `${to === 'delivered' ? 'Delivered' : 'Converted'} — ${plan.summary}${result?.docNo ? ` (${result.docNo})` : ''}` }
}
