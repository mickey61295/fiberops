/**
 * SPEC-M6 §12-1 — report-configs contracts (Wave A: the 28-report registry).
 * Configs are pure data; the service registry is bound by the same slug
 * (bind() throws on a missing register binding at import time). Pins: the
 * frozen 28-slug set, pack membership, column/filter shapes, the CSV route,
 * the render_report tool, and the register-binding rule (a bound report
 * shares ONE service with its register — never forked).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { REPORTS, getReportConfig } from '../../src/lib/erp/report-configs'
import { REPORT_PACKS } from '../../src/lib/erp/report-configs/types'
import type { ReportPackId } from '../../src/lib/erp/report-configs/types'
import { REPORT_SERVICES } from '../../src/lib/erp/reports'
import { REGISTER_SERVICES } from '../../src/lib/erp/registers'
import { REGISTER_FILTER_KEYS, REGISTER_COLUMN_FORMATS } from '../../src/lib/erp/register-configs/types'
import { getTool } from '../../src/lib/agent/tools'

const ERP_DIR = path.resolve(__dirname, '../../src/app/(erp)')

/** The 15 bound reports (SPEC-M6 §4 table — service shared with its register). */
const BOUND_SLUGS = [
  'order-register', 'inhand-orders', 'production-status', 'daily-in-out',
  'stock-register', 'stock-ledger', 'lot-tracking', 'io-history',
  'bills-register', 'supplier-bills', 'party-ledger', 'party-balance',
  'budget-vs-actual', 'production-wages', 'approval-audit',
]

/** The 13 new aggregates (§4 table). */
const NEW_SLUGS = [
  'current-stock', 'line-wip', 'rejection-summary', 'operation-summary',
  'expenses-summary', 'sample-status', 'lab-tests', 'cost-sheet-summary',
  'order-status-summary', 'despatch-packing-summary', 'outstanding-summary',
  'gst-summary', 'daily-unit-pnl',
]

describe('report-configs — SPEC-M6 §4 contracts', () => {
  it('exactly the 28 frozen reports (15 bound + 13 new); adding one is an ERRATA append', () => {
    expect(REPORTS.length).toBe(28)
    expect([...BOUND_SLUGS, ...NEW_SLUGS].sort()).toEqual(REPORTS.map((r) => r.slug).sort())
  })

  it('config registry ↔ service registry is a bijection (slug for slug)', () => {
    const configSlugs = REPORTS.map((c) => c.slug).sort()
    const serviceSlugs = Object.keys(REPORT_SERVICES).sort()
    expect(serviceSlugs).toEqual(configSlugs)
  })

  it('6 packs cover every report; pack ids are the frozen set', () => {
    const packIds = REPORT_PACKS.map((p) => p.id).sort()
    expect(packIds).toEqual(['accounts', 'costing-hr', 'inventory', 'order', 'production', 'quality'])
    for (const r of REPORTS) {
      expect(REPORT_PACKS.map((p) => p.id)).toContain(r.pack)
    }
    // the spec table's pack sizes (§4): order 5, production 5, inventory 5, accounts 6, costing-hr 5, quality 2
    const byPack = (id: ReportPackId) => REPORTS.filter((r) => r.pack === id).length
    expect(byPack('order')).toBe(5)
    expect(byPack('production')).toBe(5)
    expect(byPack('inventory')).toBe(5)
    expect(byPack('accounts')).toBe(6)
    expect(byPack('costing-hr')).toBe(5)
    expect(byPack('quality')).toBe(2)
  })

  it('daily-unit-pnl exists (the /costing/daily-pnl menu item rides it)', () => {
    expect(getReportConfig('daily-unit-pnl')).toBeDefined()
    expect(getReportConfig('daily-unit-pnl')!.pack).toBe('costing-hr')
  })

  it('the runner + csv routes exist as the dynamic [slug] segment', () => {
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/[slug]/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/[slug]/csv/route.ts'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/packs/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/mis/page.tsx'))).toBe(true)
  })

  it('render_report tool exists and lists the slugs (the ONE report door)', () => {
    const tool = getTool('render_report')
    expect(tool).toBeDefined()
    expect(tool!.isWrite).toBe(false)
    for (const slug of NEW_SLUGS) {
      expect(tool!.description).toContain(slug)
    }
  })

  for (const config of REPORTS) {
    describe(`${config.slug}`, () => {
      it('has title, askPrompt, columns and at least the render_report chip', () => {
        expect(config.title.length).toBeGreaterThan(0)
        expect(config.askPrompt.length).toBeGreaterThan(0)
        expect(config.columns.length).toBeGreaterThan(0)
      })

      it('filters ⊆ REGISTER_FILTER_KEYS (shareable register URLs)', () => {
        for (const f of config.filters) {
          expect(REGISTER_FILTER_KEYS).toContain(f.key)
        }
      })

      it('column formats are the frozen register formats', () => {
        for (const c of config.columns) {
          if (c.format) expect(REGISTER_COLUMN_FORMATS).toContain(c.format)
        }
      })

      it('agentTools exist in the tool registry (render_report included)', () => {
        const tools = [...config.agentTools]
        if (!tools.includes('render_report')) tools.push('render_report')
        for (const t of tools) {
          expect(getTool(t), `${config.slug}: ${t}`).toBeDefined()
        }
      })

      it('service smoke: returns a RegisterResult shape', async () => {
        const svc = REPORT_SERVICES[config.slug]
        const result = await svc({ limit: 10, page: 1 })
        expect(result).toHaveProperty('rows')
        expect(Array.isArray(result.rows)).toBe(true)
        expect(typeof result.summary).toBe('string')
        expect(typeof result.count).toBe('number')
      })
    })
  }

  describe('binding rule (ONE service, two screens)', () => {
    it('every bound report delegates to the SAME function as its register', () => {
      for (const slug of BOUND_SLUGS) {
        expect(REPORT_SERVICES[slug], slug).toBe(REGISTER_SERVICES[slug])
      }
    })
    it('every new aggregate is NOT a register service (no accidental fork)', () => {
      for (const slug of NEW_SLUGS) {
        expect(REGISTER_SERVICES[slug], slug).toBeUndefined()
      }
    })
  })
})
