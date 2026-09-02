'use server'
/** SPEC-M43 PRG-01 — the form door for the order delivery schedule (the
 *  Order Hub section): same planOrderDeliveries (REPLACE set) as the agent's
 *  set_order_deliveries tool. Rows post qty.<n> / date.<n> / notes.<n>. */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { planOrderDeliveries } from '@/lib/erp/posting/order-deliveries'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export async function setOrderDeliveriesAction(fd: FormData): Promise<LifecycleActionResult> {
  const orderNo = String(fd.get('orderNo') ?? '').trim()
  if (!orderNo) return { ok: false, text: 'Missing orderNo.' }

  const rows: { qty: number; date: string; notes?: string }[] = []
  for (const [name, raw] of fd.entries()) {
    const m = /^qty\.(\d+)$/.exec(name)
    if (!m) continue
    const idx = m[1]
    const qty = Number(String(raw).trim())
    const date = String(fd.get(`date.${idx}`) ?? '').trim()
    const notes = String(fd.get(`notes.${idx}`) ?? '').trim()
    if (!date) continue // blank date row = skipped
    rows.push({ qty: Number.isFinite(qty) ? qty : 0, date, ...(notes ? { notes } : {}) })
  }
  if (rows.length === 0) return { ok: false, text: 'No shipment rows — every row needs a date (qty > 0).' }

  const plan = await planOrderDeliveries({ orderNo, deliveries: rows })
  if (!plan.ok) return { ok: false, text: plan.error! }
  const user = await getSessionUser().catch(() => null)
  await runCommit(plan, { actorName: user?.email ?? 'system', actorSource: user ? 'form' : 'system', action: 'set-deliveries', entity: 'order' })
  revalidatePath(`/orders/${fd.get('orderId') ?? ''}`)
  revalidatePath('/orders/register')
  return { ok: true, text: `Schedule saved — ${plan.summary}` }
}
