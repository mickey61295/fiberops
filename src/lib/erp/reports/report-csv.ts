/**
 * Report CSV route factory + print options — SPEC-M6 §4/§5. The reports
 * twin of registers/csv.ts (same escaping, same "sibling /csv route" rule).
 * getOptions reads AppOption print.* keys for the print header (W7); the
 * table arrives with ADR-016 in Wave B — until then the helper degrades to
 * null (P2022/table-missing caught) and the header falls back to FiberOps.
 */
import type { ReportConfig } from '@/lib/erp/report-configs/types'
import { getReportConfig } from '@/lib/erp/report-configs'
import { REPORT_SERVICES } from './index'
import { flattenSearchParams, parseRegisterQuery } from '../registers/resolve'
import { buildCsvResponse } from '../registers/csv'

/** Same filters as the screen (URL query string), same service, CSV body. */
export function makeReportCsvRouteHandler(slug: string) {
  return async function GET(req: Request): Promise<Response> {
    const config = getReportConfig(slug)
    const service = REPORT_SERVICES[slug]
    if (!config || !service) return new Response(`Unknown report slug: ${slug}`, { status: 404 })
    const url = new URL(req.url)
    const params = flattenSearchParams(Object.fromEntries(url.searchParams.entries()))
    const query = parseRegisterQuery(config as never, { ...params, limit: params.limit ?? '500' })
    const result = await service(query)
    return buildCsvResponse(config as never, result)
  }
}

export interface PrintHeader {
  companyName: string
  address?: string
  gstin?: string
  /** SPEC-M18 §2-A2: masthead + bank-strip extras (AppOption print.* keys —
   *  every field optional; absent keys stay hidden, report headers unchanged). */
  phone?: string
  email?: string
  cin?: string
  bankName?: string
  bankBranch?: string
  bankAcNo?: string
  bankIfsc?: string
  upi?: string
}

/** Print header from AppOption print.* keys (SPEC-M6 §5). Degrades to null
 *  before ADR-016 lands (Wave B) or when no options are set. */
export async function getPrintHeader(): Promise<PrintHeader | null> {
  try {
    const { db } = await import('@/lib/db')
    const rows: { key: string; value: string }[] = await (db as any).appOption.findMany({ where: { group: 'print' } })
    const map = new Map<string, string>(rows.map((r: any) => [r.key as string, r.value as string]))
    const companyName = map.get('print.companyName')
    if (!companyName) return null
    const opt = (k: string) => map.get(k) || undefined
    return {
      companyName,
      address: opt('print.address'),
      gstin: opt('print.gstin'),
      phone: opt('print.phone'),
      email: opt('print.email'),
      cin: opt('print.cin'),
      bankName: opt('print.bankName'),
      bankBranch: opt('print.bankBranch'),
      bankAcNo: opt('print.bankAcNo'),
      bankIfsc: opt('print.bankIfsc'),
      upi: opt('print.upi'),
    }
  } catch {
    return null
  }
}
