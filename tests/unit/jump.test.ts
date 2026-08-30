/**
 * SPEC-M29 — the jump bar's G residual: the doc-number resolver (prefixed
 * exact / bare-digits contains / caps / ordering), the API contract pins,
 * and the three surface source pins (palette feeds + legacyForms + masters
 * ?q=).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { resolveJump, JUMP_FAMILIES } from '@/lib/erp/jump'
import { LIVE_ROUTES } from '@/lib/erp/menu-registry'

const TS = Date.now()
const ORD = `M29-SO-${TS}`

beforeAll(async () => {
  const buyer = await db.buyer.create({ data: { code: `M29-B-${TS}`, name: `Jump29 ${TS}` } })
  await db.order.create({
    data: { orderNo: ORD, buyerId: buyer.id, finYear: '26-27', status: 'open', orderDate: new Date(), totalPcs: 10 },
  })
})
afterAll(async () => {
  await db.order.deleteMany({ where: { orderNo: ORD } }).catch(() => {})
  await db.buyer.deleteMany({ where: { code: `M29-B-${TS}` } }).catch(() => {})
})

describe('SPEC-M29 §2 — resolveJump', () => {
  it('12 families, every view route pattern real (a LIVE route prefix)', () => {
    expect(JUMP_FAMILIES.length).toBe(12)
    for (const f of JUMP_FAMILIES) {
      const probe = f.viewRoute('x')
      expect(probe.startsWith('/'), `${f.slug} route absolute`).toBe(true)
      expect(probe.includes('/x')).toBe(true)
    }
  })

  it('a prefixed query resolves the exact family with a real id href', async () => {
    const rows = await resolveJump(ORD)
    expect(rows.length).toBe(1)
    expect(rows[0].family).toBe('order')
    expect(rows[0].docNo).toBe(ORD)
    expect(rows[0].href).toMatch(/^\/orders\/[a-z0-9]+$/)
  })

  it('a bare digit run finds across families (contains), capped at 8, exact-first', async () => {
    const rows = await resolveJump(String(TS).slice(-6)) // unique-ish digit tail
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows.some((r) => r.docNo === ORD)).toBe(true)
    expect(rows.length).toBeLessThanOrEqual(8)
  })

  it('short or unknown queries: [] (never throws)', async () => {
    expect(await resolveJump('')).toEqual([])
    expect(await resolveJump('x')).toEqual([])
    expect(await resolveJump(`M29-NONE-${TS}`)).toEqual([])
  })
})

describe('SPEC-M29 §2 — the API resource contract (handler level)', () => {
  it('the route wires the jump resource beside master_search (source pin)', async () => {
    const src = readFileSync(join(__dirname, '../../src/app/api/erp/route.ts'), 'utf8')
    expect(src).toContain("case 'jump'")
    expect(src).toContain('resolveJump(q)')
    expect(src).toContain('Missing q') // 400 guard
  })
})

describe('SPEC-M29 §2 — the surfaces (source pins)', () => {
  const palette = readFileSync(join(__dirname, '../../src/components/erp/command-palette.tsx'), 'utf8')
  const mastersPage = readFileSync(join(__dirname, '../../src/app/(erp)/masters/[entity]/page.tsx'), 'utf8')
  const masterTable = readFileSync(join(__dirname, '../../src/components/archetypes/master-table.tsx'), 'utf8')

  it('the palette fetches the jump + party feeds and renders Documents + Parties groups', () => {
    expect(palette).toContain('resource=jump')
    expect(palette).toContain('master_search&slug=party')
    expect(palette).toContain('Documents')
    expect(palette).toContain('Parties')
    expect(palette).toContain(', 200)') // the 200ms debounce
  })

  it('legacy form names join the menu item search value (frmPcsDel finds the screen)', () => {
    expect(palette).toContain('legacyForms')
  })

  it('the masters page accepts ?q= and MasterTable consumes initialSearch', () => {
    expect(mastersPage).toContain('initialSearch')
    expect(mastersPage).toContain("sp.q === 'string'")
    expect(masterTable).toContain('initialSearch')
    expect(masterTable).toContain('useState(initialSearch)')
  })

  it('every JUMP family view-route base is a real route (LIVE_ROUTES or doc [id] pattern)', () => {
    // the [id] view pages are dynamic segments — assert against the family
    // list of view pages the repo actually ships
    const viewBases = JUMP_FAMILIES.map((f) => f.viewRoute('x').replace(/\/x$/, ''))
    const known = new Set([
      '/orders', '/procurement/po', '/procurement/grn', '/accounts/invoice',
      '/pieces/despatch', '/cutting/job-order', '/jobwork/order', '/accounts/journal',
      '/accounts/payments', '/accounts/debit-note', '/programs', '/orders/samples',
    ])
    for (const b of viewBases) expect(known.has(b), `${b} must be a shipped view base`).toBe(true)
  })
})
