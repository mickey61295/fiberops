/**
 * SPEC-M19 §2 Wave B — generates the 5 register pages + 5 CSV routes for
 * cutting/issue/supplier registers. One-shot: `node scripts/gen_m19b_pages.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'

const ERP = path.resolve(process.cwd(), 'src/app/(erp)')

const REGISTERS = [
  { slug: 'cutting-register', route: '/cutting/register', group: 'Cutting & Panels', groupHref: '/cutting' },
  { slug: 'line-issue-register', route: '/production/issue/register', group: 'Production', groupHref: '/production' },
  { slug: 'supplier-pending', route: '/procurement/supplier-pending', group: 'Procurement', groupHref: '/procurement' },
  { slug: 'po-register', route: '/procurement/po/register', group: 'Procurement', groupHref: '/procurement' },
  { slug: 'supplier-history', route: '/procurement/supplier-history', group: 'Procurement', groupHref: '/procurement' },
]

const pageTpl = (r) => `/**
 * ${r.route} — ${r.slug} register (SPEC-M19 §2 Wave B). RegisterScreen over the
 * REGISTER_SERVICES['${r.slug}'] read path — the SAME service the config's
 * agentTools chip cites (read-side ADR-001 twin).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('${r.slug}')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['${r.slug}'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="${r.route}"
      groupLabel="${r.group}"
      groupHref="${r.groupHref}"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
`

const csvTpl = (r) => `/** CSV export for the ${r.slug} register (SPEC-M19 §2 Wave B) — same service, same filters. */
import { makeCsvRouteHandler } from '@/lib/erp/registers/csv'

export const dynamic = 'force-dynamic'

export const GET = makeCsvRouteHandler('${r.slug}')
`

let made = 0
for (const r of REGISTERS) {
  const dir = path.join(ERP, r.route)
  fs.mkdirSync(path.join(dir, 'csv'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'page.tsx'), pageTpl(r))
  fs.writeFileSync(path.join(dir, 'csv', 'route.ts'), csvTpl(r))
  made += 2
  console.log(`wrote ${r.route}/page.tsx + csv/route.ts`)
}
console.log(`done: ${made} files`)
