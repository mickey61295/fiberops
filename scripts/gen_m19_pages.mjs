/**
 * SPEC-M19 §1-D — generates the 6 register pages + 6 CSV routes for the
 * material-wise day-books (yarn/fabric/acc/general/itemwise) + orderwise pcs.
 * One-shot generator: run with `node scripts/gen_m19_pages.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'

const ERP = path.resolve(process.cwd(), 'src/app/(erp)')

const REGISTERS = [
  { slug: 'yarn-stock', route: '/inventory/stock/yarn', group: 'Inventory & Warehouse', groupHref: '/inventory' },
  { slug: 'fabric-stock', route: '/inventory/stock/fabric', group: 'Inventory & Warehouse', groupHref: '/inventory' },
  { slug: 'acc-stock', route: '/inventory/stock/accessory', group: 'Inventory & Warehouse', groupHref: '/inventory' },
  { slug: 'general-stock', route: '/inventory/stock/general', group: 'Inventory & Warehouse', groupHref: '/inventory' },
  { slug: 'itemwise-stock', route: '/inventory/stock/itemwise', group: 'Inventory & Warehouse', groupHref: '/inventory' },
  { slug: 'orderwise-pcs', route: '/pieces/orderwise', group: 'Pieces (Finished Goods)', groupHref: '/pieces/despatch' },
]

const pageTpl = (r) => `/**
 * ${r.route} — ${r.slug} register (SPEC-M19 §1). RegisterScreen over the
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

const csvTpl = (r) => `/** CSV export for the ${r.slug} register (SPEC-M19 §1-D) — same service, same filters. */
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
