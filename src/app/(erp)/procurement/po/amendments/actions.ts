'use server'
/** SPEC-M41 PRC-02 — form door for PO amendments (same planPoAmend service as update_purchase_order). */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planPoAmend } from '@/lib/erp/posting/lifecycle'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function amendPoAction(fd: FormData): Promise<LifecycleActionResult> {
  const linesRaw = String(fd.get('lines') ?? '').trim()
  let lines: Array<{ itemType: 'yarn' | 'fabric' | 'accessory'; itemCode: string; qty?: number; rate?: number }> | undefined
  if (linesRaw) {
    try {
      const parsed = JSON.parse(linesRaw)
      if (!Array.isArray(parsed) || parsed.some((l) => !l?.itemType || !l?.itemCode)) {
        return { ok: false, text: 'lines must be a JSON array of {itemType, itemCode, qty?, rate?}' }
      }
      lines = parsed.map((l: any) => ({
        itemType: l.itemType, itemCode: String(l.itemCode),
        ...(l.qty != null ? { qty: Number(l.qty) } : {}),
        ...(l.rate != null ? { rate: Number(l.rate) } : {}),
      }))
    } catch {
      return { ok: false, text: 'lines is not valid JSON — e.g. [{"itemType":"yarn","itemCode":"YRN-001","qty":120}]' }
    }
  }
  const plan = await planPoAmend({
    poNo: String(fd.get('docNo') ?? '').trim(),
    deliveryDate: String(fd.get('deliveryDate') ?? '').trim() || undefined,
    status: String(fd.get('status') ?? '').trim() || undefined,
    notes: String(fd.get('notes') ?? '').trim() || undefined,
    lines,
  })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const _user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'amend', entity: 'purchase_order' })
  revalidatePath('/procurement/po/amendments')
  revalidatePath('/procurement/po/register')
  return { ok: true, text: `PO amended — ${plan.summary}` }
}
