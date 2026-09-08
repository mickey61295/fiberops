/**
 * /hr/statutory/csv — SPEC-M47 L-03. The register csv twin IS the challan
 * data export, variant-aware:
 *   (no variant)  the full statutory register (all columns)
 *   ?variant=pf   PF challan/ECR-shaped: UAN, gross, wage base, EE, ER +
 *                 EPS/EPF/EDLI/admin breakdown
 *   ?variant=esi  ESI challan-shaped: IP number, gross, EE, ER
 *   ?variant=pt   PT challan-shaped: gross, PT per line
 *   ?variant=lwf  LWF challan-shaped: gross, EE + ER per line
 * Committed runs only (the service owns that filter). Rows come from the
 * SAME register service the screen and the agent tool use — never forked.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'

type Col = { label: string; key: string }

const FULL: Col[] = [
  { label: 'Run', key: 'run' }, { label: 'Period', key: 'period' }, { label: 'Employee', key: 'employee' },
  { label: 'UAN', key: 'uan' }, { label: 'ESI No', key: 'esiNo' }, { label: 'Gross', key: 'gross' },
  { label: 'PF Wages', key: 'pfWages' }, { label: 'PF EE', key: 'pfEe' }, { label: 'PF ER', key: 'pfEr' },
  { label: 'ESI EE', key: 'esiEe' }, { label: 'ESI ER', key: 'esiEr' }, { label: 'PT', key: 'pt' },
  { label: 'LWF EE', key: 'lwfEe' }, { label: 'Deduction', key: 'deduction' }, { label: 'Net', key: 'net' },
]
const PF: Col[] = [
  { label: 'Run', key: 'run' }, { label: 'Period', key: 'period' }, { label: 'Employee', key: 'employee' },
  { label: 'UAN', key: 'uan' }, { label: 'Gross', key: 'gross' }, { label: 'PF Wages (ceiling-capped)', key: 'pfWages' },
  { label: 'PF EE', key: 'pfEe' }, { label: 'PF ER', key: 'pfEr' }, { label: 'ER EPS', key: 'pfEps' },
  { label: 'ER EPF', key: 'pfEpf' }, { label: 'ER EDLI', key: 'pfEdli' }, { label: 'ER Admin', key: 'pfAdmin' },
]
const ESI: Col[] = [
  { label: 'Run', key: 'run' }, { label: 'Period', key: 'period' }, { label: 'Employee', key: 'employee' },
  { label: 'IP No', key: 'esiNo' }, { label: 'Gross', key: 'gross' }, { label: 'ESI EE', key: 'esiEe' }, { label: 'ESI ER', key: 'esiEr' },
]
const PT: Col[] = [
  { label: 'Run', key: 'run' }, { label: 'Period', key: 'period' }, { label: 'Employee', key: 'employee' },
  { label: 'Gross', key: 'gross' }, { label: 'PT', key: 'pt' },
]
const LWF: Col[] = [
  { label: 'Run', key: 'run' }, { label: 'Period', key: 'period' }, { label: 'Employee', key: 'employee' },
  { label: 'Gross', key: 'gross' }, { label: 'LWF EE', key: 'lwfEe' }, { label: 'LWF ER', key: 'lwfEr' },
]

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export async function GET(req: Request): Promise<Response> {
  const config = getRegisterConfig('statutory')
  const service = REGISTER_SERVICES['statutory']
  if (!config || !service) return new Response('Unknown register slug: statutory', { status: 404 })
  const url = new URL(req.url)
  const params = flattenSearchParams(Object.fromEntries(url.searchParams.entries()))
  const query = parseRegisterQuery(config, { ...params, limit: params.limit ?? '500' })
  const result = await service(query)

  const cols = params.variant === 'pf' ? PF
    : params.variant === 'esi' ? ESI
    : params.variant === 'pt' ? PT
    : params.variant === 'lwf' ? LWF
    : FULL

  const lines = [cols.map((c) => esc(c.label)).join(',')]
  for (const r of result.rows as Record<string, unknown>[]) {
    lines.push(cols.map((c) => esc(r[c.key])).join(','))
  }
  const csv = lines.join('\n')
  const name = `statutory-${params.variant ?? 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  })
}
