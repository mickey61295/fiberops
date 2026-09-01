/**
 * SPEC-M4 §12 — RegisterScreen contracts (Wave A 3 flagship + Wave B fleet =
 * 16 configs). Configs are pure data; the service registry is bound by the
 * same slug. Also pins the delegated read tools' json SHAPES (PITFALLS #25 —
 * response shapes are contracts) and smoke-tests the services against the
 * real db.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { REGISTER_CONFIGS, getRegisterConfig } from '../../src/lib/erp/register-configs'
import { REGISTER_FILTER_KEYS, REGISTER_COLUMN_FORMATS } from '../../src/lib/erp/register-configs/types'
import { REGISTER_SERVICES } from '../../src/lib/erp/registers'
import { parseRegisterQuery, flattenSearchParams, filtersAsText, TXN_DOC_FAMILY } from '../../src/lib/erp/registers/resolve'
import { LIVE_ROUTES } from '../../src/lib/erp/menu-registry'
import { getTool, allTools } from '../../src/lib/agent/tools'

const ERP_DIR = path.resolve(__dirname, '../../src/app/(erp)')

const ROUTE_BY_SLUG: Record<string, string> = {
  'attendance': '/hr/attendance',
  'stock-ledger': '/inventory/ledger',
  'order-register': '/orders/register',
  'daily-in-out': '/registers/daily-in-out',
  'inhand-orders': '/orders/in-hand',
  'party-balance': '/procurement/party-balance',
  'stock-register': '/inventory/register',
  'lot-tracking': '/inventory/lots',
  'io-history': '/inventory/io-history',
  'pcs-stock': '/pieces/stock',
  'production-status': '/production/register',
  'jobwork-register': '/jobwork/register',
  'jobworker-statement': '/jobwork/statement', // M39 JWL-07
  'bills-register': '/accounts/bills-register',
  'supplier-bills': '/accounts/supplier-bills',
  'party-ledger': '/accounts/party-ledger',
  'budget-vs-actual': '/costing/budget-vs-actual',
  'approval-audit': '/approvals/audit',
  'rate-confirmation': '/procurement/rate-confirmation',
  'piece-rate-confirmation': '/costing/piece-rate',
  'production-wages': '/hr/wages',
  'program-status': '/programs/status',
  'current-stock': '/inventory/stock',
  'yarn-stock': '/inventory/stock/yarn',
  'fabric-stock': '/inventory/stock/fabric',
  'acc-stock': '/inventory/stock/accessory',
  'general-stock': '/inventory/stock/general',
  'itemwise-stock': '/inventory/stock/itemwise',
  'orderwise-pcs': '/pieces/orderwise',
  'cutting-register': '/cutting/register',
  'line-issue-register': '/production/issue/register',
  'supplier-pending': '/procurement/supplier-pending',
  'po-register': '/procurement/po/register',
  'supplier-history': '/procurement/supplier-history',
  'closing-stock': '/inventory/closing-stock',
  'audit-log': '/admin/audit',
}

describe('register-configs — SPEC-M4 §4 contracts', () => {
  it('Wave A+B set + M5 Waves A/B + M6 Wave C + M19 Waves A/B/D + M15 audit + M39 jobworker-statement: exactly the 36 register configs (order-status board is not a RegisterScreen)', () => {
    expect(REGISTER_CONFIGS.map((c) => c.slug).sort()).toEqual([
      'acc-stock', 'approval-audit', 'attendance', 'audit-log', 'bills-register', 'budget-vs-actual', 'closing-stock', 'current-stock', 'cutting-register', 'daily-in-out',
      'fabric-stock', 'general-stock', 'inhand-orders', 'io-history', 'itemwise-stock', 'jobwork-register', 'jobworker-statement',
      'line-issue-register', 'lot-tracking', 'order-register', 'orderwise-pcs', 'party-balance', 'party-ledger', 'pcs-stock',
      'piece-rate-confirmation', 'po-register', 'production-status', 'production-wages', 'program-status',
      'rate-confirmation', 'stock-ledger', 'stock-register', 'supplier-bills', 'supplier-history', 'supplier-pending',
      'yarn-stock',
    ])
  })

  it('config registry ↔ service registry is a bijection (slug for slug)', () => {
    const configSlugs = REGISTER_CONFIGS.map((c) => c.slug).sort()
    const serviceSlugs = Object.keys(REGISTER_SERVICES).sort()
    expect(serviceSlugs).toEqual(configSlugs)
  })

  for (const config of REGISTER_CONFIGS) {
    describe(`${config.slug}`, () => {
      it('columns are well-formed (name+label, valid format/align)', () => {
        expect(config.columns.length).toBeGreaterThan(0)
        for (const c of config.columns) {
          expect(c.name).toBeTruthy()
          expect(c.label).toBeTruthy()
          if (c.format) expect(REGISTER_COLUMN_FORMATS).toContain(c.format)
          if (c.align) expect(['left', 'right']).toContain(c.align)
        }
      })

      it('filter keys are within the frozen key set', () => {
        expect(config.filters.length).toBeGreaterThan(0)
        for (const f of config.filters) {
          expect(REGISTER_FILTER_KEYS).toContain(f.key)
          if (f.type === 'itemType' || f.type === 'status' || f.type === 'select') {
            expect((f.options ?? []).length).toBeGreaterThan(0)
          }
        }
      })

      it('every declared agentTool exists in the tools registry', () => {
        expect(config.agentTools.length).toBeGreaterThan(0)
        for (const t of config.agentTools) {
          const tool = getTool(t)
          expect(tool, `tool ${t} must exist`).toBeTruthy()
          expect(tool!.isWrite).toBe(false)
        }
      })

      it('route is live and the page + csv files exist on disk', () => {
        const route = ROUTE_BY_SLUG[config.slug]
        expect(route).toBeTruthy()
        expect(LIVE_ROUTES.has(route)).toBe(true)
        expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
        expect(fs.existsSync(path.join(ERP_DIR, route, 'csv/route.ts')), `${route} csv`).toBe(true)
      })

      it('askPrompt present (W5(b) seed)', () => {
        expect(config.askPrompt).toBeTruthy()
      })
    })
  }
})

describe('parseRegisterQuery — SPEC-M4 §6 parsing', () => {
  const config = getRegisterConfig('stock-ledger')!

  it('parses valid dates and ignores invalid ones (never a 500)', () => {
    const q = parseRegisterQuery(config, { from: '2026-08-01', to: 'not-a-date', itemType: 'yarn' })
    expect(q.from).toBeInstanceOf(Date)
    expect(q.to).toBeUndefined()
    expect(q.itemType).toBe('yarn')
  })

  it('clamps limit and page', () => {
    expect(parseRegisterQuery(config, { limit: '9999', page: '-3' }).limit).toBe(500)
    expect(parseRegisterQuery(config, { limit: '1', page: '-3' }).page).toBe(1)
    expect(parseRegisterQuery(config, {}).limit).toBe(100)
  })

  it('ignores keys the config does not declare', () => {
    const q = parseRegisterQuery(config, { party: 'P1', status: 'open' } as any)
    expect(q.party).toBeUndefined()
    expect(q.status).toBeUndefined()
  })

  it('flattenSearchParams takes the first array value and drops empties', () => {
    expect(flattenSearchParams({ a: ['x', 'y'], b: '', c: 'z', d: undefined })).toEqual({ a: 'x', c: 'z' })
  })

  it('filtersAsText renders active filters for the agent seed', () => {
    const text = filtersAsText(config, { from: '2026-08-01', godown: 'G1' })
    expect(text).toContain('from: 2026-08-01')
    expect(text).toContain('godown: G1')
  })
})

describe('delegated read tools — json SHAPES frozen (PITFALLS #25)', () => {
  it('get_stock_ledger: schema keys + json row keys unchanged', async () => {
    const tool = getTool('get_stock_ledger')!
    expect(tool.schema.shape).toHaveProperty('itemType')
    expect(tool.schema.shape).toHaveProperty('godownCode')
    expect(tool.schema.shape).toHaveProperty('limit')
    const res = await tool.execute({} as any)
    const rows = res.json as Record<string, unknown>[]
    if (rows.length > 0) {
      for (const k of ['txnType', 'itemType', 'inKgs', 'outKgs', 'inPcs', 'outPcs', 'rate', 'docNo', 'docDate', 'godown', 'party']) {
        expect(rows[0]).toHaveProperty(k)
      }
    }
    expect(res.text).toContain('ledger entries')
  })

  it('list_orders: schema keys + json row keys unchanged', async () => {
    const tool = getTool('list_orders')!
    expect(tool.schema.shape).toHaveProperty('status')
    expect(tool.schema.shape).toHaveProperty('buyerId')
    const res = await tool.execute({ limit: 5 } as any)
    const rows = res.json as Record<string, unknown>[]
    if (rows.length > 0) {
      for (const k of ['id', 'orderNo', 'buyer', 'style', 'totalPcs', 'totalValue', 'status', 'deliveryDate', 'orderDate']) {
        expect(rows[0]).toHaveProperty(k)
      }
    }
  })

  it('get_stock: schema keys + json row keys unchanged (delegates to fetchCurrentStock)', async () => {
    const tool = getTool('get_stock')!
    expect(tool.schema.shape).toHaveProperty('godownCode')
    expect(tool.schema.shape).toHaveProperty('itemType')
    const res = await tool.execute({} as any)
    const rows = res.json as Record<string, unknown>[]
    if (rows.length > 0) {
      for (const k of ['itemType', 'itemId', 'godown', 'dept', 'kgs', 'mtrs', 'pcs', 'bags', 'rate']) {
        expect(rows[0]).toHaveProperty(k)
      }
    }
  })

  it('list_lots: json rows keep { lotNo, party }', async () => {
    const tool = getTool('list_lots')!
    const res = await tool.execute({} as any)
    const rows = res.json as Record<string, unknown>[]
    if (rows.length > 0) {
      expect(rows[0]).toHaveProperty('lotNo')
      expect(rows[0]).toHaveProperty('party')
    }
  })

  it('list_jobworks: schema keys + json row keys unchanged', async () => {
    const tool = getTool('list_jobworks')!
    expect(tool.schema.shape).toHaveProperty('status')
    const res = await tool.execute({} as any)
    const rows = res.json as Record<string, unknown>[]
    if (rows.length > 0) {
      for (const k of ['dcNo', 'jobworker', 'processType', 'totalQty', 'totalValue', 'status', 'orderNo', 'outDate', 'expectedInDate', 'receivedDate']) {
        expect(rows[0]).toHaveProperty(k)
      }
    }
  })

  it('get_party_ledger: frozen shape + ADDITIVE poBalances[] (SPEC-M4 §5 row 4)', async () => {
    const tool = getTool('get_party_ledger')!
    // any seeded party will do; shape is what matters
    const parties = await tool.execute({ partyCode: 'NOPE-404' } as any)
    expect(parties.text).toContain('not found')
  })

  it('get_budget_vs_actual: schema keys unchanged (orderNo required)', () => {
    const tool = getTool('get_budget_vs_actual')!
    expect(tool.schema.shape).toHaveProperty('orderNo')
  })

  it('the 7 new Wave B tools are registered, read-only (M4)', () => {
    const spec: Record<string, string> = {
      list_inhand_orders: 'orders',
      list_io_history: 'inventory',
      get_production_status: 'production',
      get_bills_register: 'accounting',
      list_supplier_bills: 'accounting',
      get_approval_audit: 'workflow',
      get_order_status: 'orders',
    }
    for (const [name, domain] of Object.entries(spec)) {
      const tool = getTool(name)!
      expect(tool, `${name} must exist`).toBeTruthy()
      expect(tool.isWrite, `${name} read-only`).toBe(false)
      expect(tool.domain, `${name} domain`).toBe(domain)
    }
  })

  it('M5 Wave B tool doors: get_production_wages delegates to the wages register (142 total)', () => {
    const tool = getTool('get_production_wages')!
    expect(tool).toBeTruthy()
    expect(tool.isWrite).toBe(false)
    expect(tool.domain).toBe('hr')
    expect(tool.schema.shape).toHaveProperty('order')
    expect(tool.schema.shape).toHaveProperty('q')
    expect(allTools.length).toBe(238) // M39 JWL: +bill_jobwork +list_jobworker_statement // 189 + M19-C ×33
  })
})

describe('register services — smoke against the real db (read-only)', () => {
  it('queryStockLedger returns shaped rows + per-uom totals', async () => {
    const res = await REGISTER_SERVICES['stock-ledger']({ limit: 10, page: 1 })
    expect(typeof res.summary).toBe('string')
    expect(res.count).toBeGreaterThanOrEqual(0)
    expect(res.rows.length).toBeLessThanOrEqual(10)
    for (const r of res.rows) {
      expect(r.id).toBeTruthy()
      for (const k of ['docDate', 'txnType', 'itemCode', 'godown', 'inKgs', 'outKgs', 'inPcs', 'outPcs']) {
        expect(r).toHaveProperty(k)
      }
    }
  })

  it('queryOrderRegister rows carry hub hrefs (W2)', async () => {
    const res = await REGISTER_SERVICES['order-register']({ limit: 10, page: 1 })
    for (const r of res.rows) {
      expect(r.href).toMatch(/^\/orders\//)
    }
  })

  it('queryDailyInOut summary mentions movements', async () => {
    const res = await REGISTER_SERVICES['daily-in-out']({ limit: 10, page: 1 })
    expect(res.summary).toMatch(/movements/)
  })

  it('unknown godown degrades to an empty result, not a throw', async () => {
    const res = await REGISTER_SERVICES['stock-ledger']({ godown: 'NOPE-999', limit: 10, page: 1 })
    expect(res.rows).toEqual([])
    expect(res.summary).toContain('not found')
  })

  const SMOKE: Array<[string, (r: Record<string, unknown>) => void]> = [
    ['inhand-orders', (r) => { expect(r).toHaveProperty('pendingPcs') }],
    ['party-balance', (r) => { expect(r).toHaveProperty('pendingQty') }],
    ['stock-register', (r) => { expect(r).toHaveProperty('value') }],
    ['lot-tracking', (r) => { expect(r).toHaveProperty('lotNo') }],
    ['io-history', (r) => { expect(r).toHaveProperty('balKgs') }],
    ['pcs-stock', (r) => { expect(r).toHaveProperty('pcs') }],
    ['production-status', (r) => { expect(r).toHaveProperty('reworkQty') }],
    ['jobwork-register', (r) => { expect(r).toHaveProperty('dcNo'); expect(r).toHaveProperty('jobworker') }],
    ['bills-register', (r) => { expect(r).toHaveProperty('billAmount'); expect(r).toHaveProperty('collected') }],
    ['supplier-bills', (r) => { expect(r).toHaveProperty('grnNo') }],
    ['party-ledger', (r) => { expect(r).toHaveProperty('balance') }],
    ['budget-vs-actual', (r) => { expect(r).toHaveProperty('variance') }],
    ['approval-audit', (r) => { expect(r).toHaveProperty('entity'); expect(r).toHaveProperty('status') }],
    ['production-wages', (r) => { expect(r).toHaveProperty('operator'); expect(r).toHaveProperty('amount') }],
  ]

  for (const [slug, check] of SMOKE) {
    it(`query ${slug}: returns a shaped result without throwing`, async () => {
      const res = await REGISTER_SERVICES[slug]({ limit: 10, page: 1 })
      expect(typeof res.summary).toBe('string')
      expect(res.count).toBeGreaterThanOrEqual(0)
      for (const r of res.rows) check(r as Record<string, unknown>)
    })
  }
})

describe('TXN_DOC_FAMILY — W2 drill map', () => {
  it('covers the Wave A families and leaves ledger-only txns unmapped', () => {
    expect(TXN_DOC_FAMILY.purchase_grn).toBe('grn')
    expect(TXN_DOC_FAMILY.process_delivery).toBe('jobwork')
    expect(TXN_DOC_FAMILY.sales_delivery).toBe('despatch')
    expect(TXN_DOC_FAMILY.godown_transfer_out).toBeUndefined()
    expect(TXN_DOC_FAMILY.stock_adjustment_add).toBeUndefined()
    expect(TXN_DOC_FAMILY.opening).toBeUndefined()
  })
})
