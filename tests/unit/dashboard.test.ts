/**
 * SPEC-M16 — Dashboard 2.0: registry invariants (defaults ⊆ registry, 7 roles),
 * snapshot math (tile values, chain funnel, 30-point gap-filled trends, role
 * chart picks), tile-layout persistence (AppOption dashboard:<role>:tiles),
 * and the save action's authorization (own-role only, cookie-mock pattern).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import {
  TILE_REGISTRY, ROLE_DEFAULTS, roleProfile,
  getDashboardSnapshot, getEffectiveTiles, saveRoleTiles,
} from '@/lib/erp/dashboard'

const SCHEMA_ROLES = ['admin', 'merchandiser', 'storekeeper', 'accountant', 'production_mgr', 'cutting_mgr', 'hr']

// ── Pure registry invariants (no db) ────────────────────────────────────────

describe('SPEC-M16 §3.1 — registry & role profiles', () => {
  it('registry ids are unique and every tile carries the render contract', () => {
    const ids = TILE_REGISTRY.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TILE_REGISTRY) {
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(t.href.startsWith('/')).toBe(true)
      expect(['emerald', 'amber', 'teal', 'slate', 'rose', 'violet']).toContain(t.color)
    }
  })

  it('ROLE_DEFAULTS covers exactly the 7 schema roles', () => {
    expect(Object.keys(ROLE_DEFAULTS).sort()).toEqual([...SCHEMA_ROLES].sort())
  })

  it('every role default is a subset of the registry with valid chart/recent picks', () => {
    const ids = new Set(TILE_REGISTRY.map((t) => t.id))
    for (const [role, p] of Object.entries(ROLE_DEFAULTS)) {
      expect(p.tiles.length, `${role} tiles non-empty`).toBeGreaterThan(0)
      for (const id of p.tiles) expect(ids.has(id), `${role} tile ${id} in registry`).toBe(true)
      for (const c of p.charts) expect(['chain', 'production', 'cash']).toContain(c)
      for (const r of p.recent) expect(['orders', 'pos', 'cuts', 'invoices']).toContain(r)
    }
  })

  it('unknown roles degrade to the admin profile (never a blank dashboard)', () => {
    expect(roleProfile('alien_role').tiles).toEqual(ROLE_DEFAULTS.admin.tiles)
    expect(roleProfile(null).tiles).toEqual(ROLE_DEFAULTS.admin.tiles)
  })

  it('the spec personas hold: merchandiser = pipeline, accountant = cash', () => {
    expect(ROLE_DEFAULTS.merchandiser.tiles).toContain('inhand_pcs')
    expect(ROLE_DEFAULTS.merchandiser.charts).toContain('chain')
    expect(ROLE_DEFAULTS.accountant.tiles).toContain('received_30d')
    expect(ROLE_DEFAULTS.accountant.charts).toEqual(['cash'])
  })
})

// ── Persistence (AppOption dashboard:<role>:tiles) ──────────────────────────

describe('SPEC-M16 §3.1 — tile layout persistence', () => {
  const ROLE = 'storekeeper'
  const KEY = `dashboard:${ROLE}:tiles`

  afterAll(async () => {
    await db.appOption.deleteMany({ where: { key: KEY } }).catch(() => {})
  })

  it('no saved layout → role defaults', async () => {
    await db.appOption.deleteMany({ where: { key: KEY } })
    expect(await getEffectiveTiles(ROLE)).toEqual(ROLE_DEFAULTS.storekeeper.tiles)
  })

  it('saved order wins and invalid ids are dropped at save time', async () => {
    await saveRoleTiles(ROLE, ['low_stock', 'stock_value', 'bogus_tile'])
    expect(await getEffectiveTiles(ROLE)).toEqual(['low_stock', 'stock_value'])
  })

  it('save null resets to defaults', async () => {
    await saveRoleTiles(ROLE, null)
    expect(await getEffectiveTiles(ROLE)).toEqual(ROLE_DEFAULTS.storekeeper.tiles)
  })

  it('corrupt JSON row degrades to defaults (never a crash)', async () => {
    await db.appOption.upsert({
      where: { key: KEY },
      update: { value: '{not json' },
      create: { key: KEY, value: '{not json', group: 'dashboard', label: 'corrupt fixture' },
    })
    expect(await getEffectiveTiles(ROLE)).toEqual(ROLE_DEFAULTS.storekeeper.tiles)
    await db.appOption.deleteMany({ where: { key: KEY } })
  })
})

// ── Snapshot (fixtures, inclusion/shape assertions — the shared dev db makes
//    exact totals environment-dependent) ────────────────────────────────────

const TS = Date.now()
const ORDER_NO = `M16-SO-${TS}`
const INVOICE_NO = `M16-INV-${TS}`
const VOUCHER_NO = `M16-RCPT-${TS}`

let buyerId = '', styleId = '', partyId = '', deptId = '', orderId = ''

describe('SPEC-M16 §3.1 — getDashboardSnapshot', () => {
  beforeAll(async () => {
    const b = await db.buyer.create({ data: { code: `M16-B-${TS}`, name: `M16 Buyer ${TS}` } })
    buyerId = b.id
    const s = await db.style.create({ data: { styleNo: `M16-ST-${TS}` } })
    styleId = s.id
    const p = await db.party.create({ data: { code: `M16-P-${TS}`, name: `M16 Party ${TS}` } })
    partyId = p.id
    const d = await db.department.create({ data: { code: `M16-D-${TS}`, name: `M16 Dept ${TS}`, orderSno: 99 } })
    deptId = d.id

    // future-dated order: guaranteed newest → recent-orders inclusion is deterministic
    const o = await db.order.create({
      data: {
        orderNo: ORDER_NO, buyerId, styleId, finYear: '26-27', status: 'open', totalPcs: 1234,
        orderDate: new Date(Date.now() + 10000),
      },
    })
    orderId = o.id
    await db.productionEntry.create({
      data: { orderId, deptId, prodDate: new Date(), qty: 500, rate: 0 },
    })
    await db.salesInvoice.create({
      data: { invoiceNo: INVOICE_NO, partyId, invoiceDate: new Date(), finYear: '26-27', billAmount: 100000, status: 'issued' },
    })
    await db.payment.create({
      data: { voucherNo: VOUCHER_NO, partyId, direction: 'in', payDate: new Date(), finYear: '26-27', amount: 40000 },
    })
  })

  afterAll(async () => {
    await db.payment.deleteMany({ where: { voucherNo: VOUCHER_NO } }).catch(() => {})
    await db.salesInvoice.deleteMany({ where: { invoiceNo: INVOICE_NO } }).catch(() => {})
    await db.productionEntry.deleteMany({ where: { orderId } }).catch(() => {})
    await db.order.deleteMany({ where: { orderNo: ORDER_NO } }).catch(() => {})
    await db.department.deleteMany({ where: { id: deptId } }).catch(() => {})
    await db.party.deleteMany({ where: { id: partyId } }).catch(() => {})
    await db.style.deleteMany({ where: { id: styleId } }).catch(() => {})
    await db.buyer.deleteMany({ where: { id: buyerId } }).catch(() => {})
    await db.appOption.deleteMany({ where: { key: { startsWith: 'dashboard:' } } }).catch(() => {})
    await db.$disconnect()
  })

  it('admin snapshot: tiles carry values; open_orders matches a fresh count', async () => {
    const snap = await getDashboardSnapshot('admin')
    const ids = snap.tiles.map((t) => t.id)
    expect(ids).toEqual(expect.arrayContaining(['open_orders', 'today_pcs', 'invoiced_30d', 'received_30d']))
    const openOrders = snap.tiles.find((t) => t.id === 'open_orders')!
    const fresh = await db.order.count({ where: { status: { in: ['open', 'in_progress'] } } })
    expect(openOrders.value).toBe(String(fresh))
    for (const t of snap.tiles) expect(t.value).toBeTruthy()
  })

  it('today_pcs includes the fixture entry; trends are 30-point and gap-filled', async () => {
    const snap = await getDashboardSnapshot('admin')
    const today = snap.tiles.find((t) => t.id === 'today_pcs')!
    expect(Number(today.value.replace(/,/g, ''))).toBeGreaterThanOrEqual(500)
    expect(snap.productionTrend).toHaveLength(30)
    const last = snap.productionTrend[29]
    expect(last.pcs).toBeGreaterThanOrEqual(500)
    // gap-filling: a db with sparse prodDates still yields 30 contiguous points
    expect(snap.productionTrend.every((p) => typeof p.date === 'string' && p.pcs >= 0)).toBe(true)
  })

  it('cashTrend sums the fixture invoice + receipt into the last point', async () => {
    const snap = await getDashboardSnapshot('admin')
    expect(snap.cashTrend).toHaveLength(30)
    expect(snap.cashTrend[29].invoiced).toBeGreaterThanOrEqual(100000)
    expect(snap.cashTrend[29].received).toBeGreaterThanOrEqual(40000)
  })

  it('chain funnel: 9 stages over OPEN orders, order flag = total open orders', async () => {
    const snap = await getDashboardSnapshot('admin')
    expect(snap.chainFunnel.map((f) => f.key)).toEqual([
      'order', 'bom', 'program', 'cut', 'lineIssue', 'production', 'invoice', 'cost', 'payment',
    ])
    const fresh = await db.order.count({ where: { status: { in: ['open', 'in_progress'] } } })
    expect(snap.chainFunnel[0].count).toBe(fresh)
    // the funnel is monotone non-increasing after 'order' is NOT guaranteed
    // (flags are independent), but production ≥ 1 thanks to the fixture entry
    expect(snap.chainFunnel.find((f) => f.key === 'production')!.count).toBeGreaterThanOrEqual(1)
  })

  it('role-aware render: merchandiser gets pipeline tiles, NOT storekeeper tiles; recent orders include the fixture', async () => {
    await db.appOption.deleteMany({ where: { key: 'dashboard:merchandiser' } })
    const snap = await getDashboardSnapshot('merchandiser')
    const ids = snap.tiles.map((t) => t.id)
    expect(ids).toContain('inhand_pcs')
    expect(ids).toContain('samples_pending')
    expect(ids).not.toContain('low_stock')
    expect(ids).not.toContain('employees')
    // newest order (future-dated fixture) leads the recent list
    expect(snap.recent.orders.some((r) => r.docNo === ORDER_NO)).toBe(true)
    // chart picks honored: merchandiser has no cash chart payload
    expect(snap.cashTrend).toHaveLength(0)
  })

  it('role-aware render: accountant computes ONLY the cash trend', async () => {
    await db.appOption.deleteMany({ where: { key: 'dashboard:accountant' } })
    const snap = await getDashboardSnapshot('accountant')
    expect(snap.cashTrend).toHaveLength(30)
    expect(snap.productionTrend).toHaveLength(0)
    const ids = snap.tiles.map((t) => t.id)
    expect(ids).toContain('received_30d')
    expect(ids).not.toContain('today_pcs')
  })

  it('saved layout changes which tiles render (persistence end-to-end)', async () => {
    await saveRoleTiles('merchandiser', ['employees', 'open_orders'])
    const snap = await getDashboardSnapshot('merchandiser')
    expect(snap.tiles.map((t) => t.id)).toEqual(['employees', 'open_orders'])
    await saveRoleTiles('merchandiser', null)
  })
})

// ── Save action authorization (cookie-mock pattern, M7-B precedent) ────────

const cookieStore = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name in cookieStore ? { name, value: cookieStore[name] } : undefined),
  }),
}))

import { saveDashboardTiles } from '@/app/(erp)/dashboard/actions'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session'

describe('SPEC-M16 §3.2 — saveDashboardTiles authorization', () => {
  const EMAIL = `m16-${TS}@fiberpro.local`
  let merchId = ''

  beforeAll(async () => {
    const u = await db.user.create({
      data: { email: EMAIL, name: 'M16 Merch', role: 'merchandiser', passwordHash: 'scrypt$x$y', active: true },
    })
    merchId = u.id
  })

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: EMAIL } }).catch(() => {})
    await db.appOption.deleteMany({ where: { key: 'dashboard:merchandiser' } }).catch(() => {})
  })

  beforeEach(() => {
    for (const k of Object.keys(cookieStore)) delete cookieStore[k]
  })

  it('no session → rejected', async () => {
    const res = await saveDashboardTiles('merchandiser', ['open_orders'])
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Authentication')
  })

  it('session user may only save their OWN role layout', async () => {
    cookieStore[SESSION_COOKIE] = await createSessionToken(merchId)
    const wrong = await saveDashboardTiles('admin', ['open_orders'])
    expect(wrong.ok).toBe(false)
    expect(wrong.error).toContain('own role')
    const right = await saveDashboardTiles('merchandiser', ['open_orders', 'inhand_pcs'])
    expect(right.ok).toBe(true)
    expect(await getEffectiveTiles('merchandiser')).toEqual(['open_orders', 'inhand_pcs'])
  })

  it('reset via null restore defaults', async () => {
    cookieStore[SESSION_COOKIE] = await createSessionToken(merchId)
    const res = await saveDashboardTiles('merchandiser', null)
    expect(res.ok).toBe(true)
    expect(await getEffectiveTiles('merchandiser')).toEqual(ROLE_DEFAULTS.merchandiser.tiles)
  })
})
