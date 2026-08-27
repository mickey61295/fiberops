/**
 * SPEC-M4 §12 — RegisterScreen contracts (Wave A subset: 3 flagship configs).
 * Configs are pure data; the service registry is bound by the same slug.
 * Also pins the delegated read tools' json SHAPES (PITFALLS #25 — response
 * shapes are contracts) and smoke-tests the services against the real db.
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
  'stock-ledger': '/inventory/ledger',
  'order-register': '/orders/register',
  'daily-in-out': '/registers/daily-in-out',
}

describe('register-configs — SPEC-M4 §4 contracts', () => {
  it('Wave A set: exactly the 3 flagship configs', () => {
    expect(REGISTER_CONFIGS.map((c) => c.slug).sort()).toEqual(['daily-in-out', 'order-register', 'stock-ledger'])
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

      it('route is live and the page file exists on disk', () => {
        const route = ROUTE_BY_SLUG[config.slug]
        expect(route).toBeTruthy()
        expect(LIVE_ROUTES.has(route)).toBe(true)
        const pageFile = path.join(ERP_DIR, route.replace(/^\//, ''), 'page.tsx')
        expect(fs.existsSync(pageFile), `${pageFile} must exist`).toBe(true)
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

  it('get_daily_in_out: the NEW Wave A tool is registered, read-only, inventory domain', () => {
    const tool = getTool('get_daily_in_out')!
    expect(tool).toBeTruthy()
    expect(tool.isWrite).toBe(false)
    expect(tool.domain).toBe('inventory')
    expect(allTools.length).toBe(123) // 122 + get_daily_in_out (Wave A)
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
