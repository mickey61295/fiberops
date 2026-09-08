'use server'
/** SPEC-M47 L-03 — the /admin/statutory write door (setStatutory — registry
 * drift-safe; unknown names rejected server-side). Role-guarded here; the
 * same action serves the PF/ESI/PT/LWF head cards. */
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/current-user'
import { setStatutory } from '@/lib/erp/statutory'

export type StatutoryActionResult = { ok: boolean; text: string }

const RATE_FIELDS: Record<string, string[]> = {
  pf: ['pf.enabled', 'pf.eeRate', 'pf.erRate', 'pf.epsRate', 'pf.edliRate', 'pf.adminRate', 'pf.wageCeiling'],
  esi: ['esi.enabled', 'esi.eeRate', 'esi.erRate', 'esi.wageThreshold'],
  pt: ['pt.enabled', 'pt.monthlyAmount', 'pt.threshold'],
  lwf: ['lwf.enabled', 'lwf.eeAmount', 'lwf.erAmount'],
}

export async function updateStatutoryAction(fd: FormData): Promise<StatutoryActionResult> {
  const user = await getSessionUser().catch(() => null)
  if (user?.role !== 'admin') {
    return { ok: false, text: 'Admin role required — statutory rates are owner config.' }
  }
  const head = String(fd.get('__head') ?? '').trim()
  const fields = RATE_FIELDS[head]
  if (!fields) return { ok: false, text: `Unknown statutory head: ${head || '(none)'}` }
  try {
    for (const name of fields) {
      if (name.endsWith('.enabled')) {
        await setStatutory(name, fd.get(name) === 'on' || fd.get(name) === 'true')
      } else {
        const raw = String(fd.get(name) ?? '').trim()
        if (raw === '') return { ok: false, text: `Field ${name} is empty — enter 0 to disable a rate, not blank.` }
        await setStatutory(name, raw)
      }
    }
  } catch (err) {
    return { ok: false, text: err instanceof Error ? err.message : String(err) }
  }
  revalidatePath('/admin/statutory')
  revalidatePath('/hr/statutory')
  return { ok: true, text: `${head.toUpperCase()} rates saved — new payroll runs freeze these values at plan time.` }
}
