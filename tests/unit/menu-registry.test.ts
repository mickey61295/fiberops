/**
 * Menu registry unit tests — SPEC-M1 §10.
 * Guards the frozen contract: 113 items, 17 groups, unique ids/routes,
 * LIVE_ROUTES matches files on disk, getHref/isLive/parityStats behavior.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  MENU_GROUPS,
  MENU_ITEMS,
  LIVE_ROUTES,
  isLive,
  getHref,
  groupLandingHref,
  findItemById,
  findGroupById,
  findItemByRoute,
  findGroupByLanding,
  findGroupByRoutePrefix,
  parityStats,
  type MenuItem,
} from '../../src/lib/erp/menu-registry'

const ERP_DIR = path.resolve(__dirname, '../../src/app/(erp)')

describe('menu registry — frozen contract (SPEC-M1)', () => {
  it('has exactly 113 items', () => {
    expect(MENU_ITEMS.length).toBe(113)
  })

  it('has exactly 17 groups', () => {
    expect(MENU_GROUPS.length).toBe(17)
  })

  it('has unique, kebab-case item ids', () => {
    const ids = MENU_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('every item.groupId resolves to a group', () => {
    const groupIds = new Set(MENU_GROUPS.map((g) => g.id))
    for (const item of MENU_ITEMS) expect(groupIds.has(item.groupId)).toBe(true)
  })

  it('every item.route starts with "/" and routes are unique', () => {
    const routes = MENU_ITEMS.map((i) => i.route)
    for (const r of routes) expect(r.startsWith('/')).toBe(true)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('every group has at least one item', () => {
    for (const g of MENU_GROUPS) {
      expect(MENU_ITEMS.some((i) => i.groupId === g.id)).toBe(true)
    }
  })

  it('LIVE_ROUTES are routes; /coming is a prefix entry, not an item route', () => {
    for (const r of LIVE_ROUTES) expect(r.startsWith('/')).toBe(true)
    expect(MENU_ITEMS.some((i) => i.route === '/coming')).toBe(false)
  })

  it('getHref: live items → route; coming items → /coming/<id>', () => {
    for (const item of MENU_ITEMS) {
      const href = getHref(item)
      if (isLive(item)) expect(href).toBe(item.route)
      else expect(href).toBe(`/coming/${item.id}`)
    }
  })

  it('isLive: dashboard + grn-entry true (Wave C), pcs-receipt still coming', () => {
    expect(isLive(findItemById('dashboard') as MenuItem)).toBe(true)
    expect(isLive(findItemById('grn-entry') as MenuItem)).toBe(true)
    expect(isLive(findItemById('pcs-receipt') as MenuItem)).toBe(false)
  })

  it('parityStats: 48 live items of 113 after M5 Wave A; 14/17 groups', () => {
    const s = parityStats()
    expect(s.totalItems).toBe(113)
    expect(s.liveItems).toBe(48)
    expect(s.comingItems).toBe(65)
    expect(s.liveGroups).toBe(14)
    expect(s.legacyLive).toBeGreaterThan(0)
    expect(s.coveragePct).toBeGreaterThan(0)
  })

  it('Wave A (M4): the 3 flagship register routes are live with page files + tool doors', () => {
    const waveA = [
      { route: '/registers/daily-in-out', id: 'daily-in-out', tool: 'get_daily_in_out' },
      { route: '/orders/register', id: 'order-register', tool: 'list_orders' },
      { route: '/inventory/ledger', id: 'stock-ledger', tool: 'get_stock_ledger' },
    ]
    for (const { route, id, tool } of waveA) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain(tool)
    }
  })

  it('Wave B (M4): the 13 register routes are live with page + csv files + tool doors wired', () => {
    const waveB = [
      { route: '/orders/in-hand', id: 'inhand-orders', tool: 'list_inhand_orders' },
      { route: '/procurement/party-balance', id: 'party-balance', tool: 'get_party_ledger' },
      { route: '/inventory/register', id: 'stock-register', tool: 'get_stock_ledger' },
      { route: '/inventory/lots', id: 'lot-tracking', tool: 'list_lots' },
      { route: '/inventory/io-history', id: 'io-history', tool: 'list_io_history' },
      { route: '/pieces/stock', id: 'pcs-stock', tool: 'get_stock' },
      { route: '/production/register', id: 'production-status-register', tool: 'get_production_status' },
      { route: '/jobwork/register', id: 'job-order-list', tool: 'list_jobworks' },
      { route: '/accounts/bills-register', id: 'bills-register', tool: 'get_bills_register' },
      { route: '/accounts/supplier-bills', id: 'supplier-bill-register', tool: 'list_supplier_bills' },
      { route: '/accounts/party-ledger', id: 'party-ledger', tool: 'get_party_ledger' },
      { route: '/costing/budget-vs-actual', id: 'budget-vs-actual', tool: 'get_budget_vs_actual' },
      { route: '/approvals/audit', id: 'approval-audit-trail', tool: 'get_approval_audit' },
    ]
    for (const { route, id, tool } of waveB) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain(tool)
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
      expect(fs.existsSync(path.join(ERP_DIR, route, 'csv/route.ts')), `${route} csv`).toBe(true)
    }
    // no pendingTools left on the Wave B fleet
    for (const { id } of waveB) {
      expect((findItemById(id) as MenuItem).pendingTools, `${id} pendingTools`).toEqual([])
    }
    // order-status-board gets the new tool now (board screen itself is Wave C)
    expect((findItemById('order-status-board') as MenuItem).agentTools).toContain('get_order_status')
  })

  it('Wave C (M4): the Order Status Board is live (page file, board archetype)', () => {
    expect(LIVE_ROUTES.has('/orders/status')).toBe(true)
    expect(isLive(findItemById('order-status-board') as MenuItem)).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'orders/status/page.tsx'))).toBe(true)
  })

  it('every LIVE route (except /coming prefix) has a page file on disk', () => {
    for (const route of LIVE_ROUTES) {
      if (route === '/coming') continue
      const file =
        route === '/'
          ? path.join(ERP_DIR, 'page.tsx')
          : path.join(ERP_DIR, route, 'page.tsx')
      expect(fs.existsSync(file), `missing page file for ${route} → ${file}`).toBe(true)
    }
  })

  it('Wave C: the 11 chain item routes are live with [id] view routes where the op creates a document', () => {
    const waveCItems = [
      '/programs/new', '/procurement/po', '/procurement/grn', '/jobwork/order',
      '/jobwork/receipt', '/cutting/job-order', '/production/issue',
      '/production/entry', '/production/rework', '/pieces/rejection', '/pieces/despatch',
    ]
    for (const r of waveCItems) {
      expect(LIVE_ROUTES.has(r), r).toBe(true)
      expect(isLive(findItemByRoute(r)!), r).toBe(true)
    }
    // view routes (no own menu item — reached from recent-docs tables + Hub rows)
    const waveCViews = [
      '/programs/[id]', '/procurement/po/[id]', '/procurement/grn/[id]', '/jobwork/order/[id]',
      '/cutting/job-order/[id]', '/production/issue/[id]', '/production/entry/[id]',
      '/pieces/rejection/[id]', '/pieces/despatch/[id]',
    ]
    for (const r of waveCViews) {
      expect(LIVE_ROUTES.has(r), r).toBe(true)
      expect(fs.existsSync(path.join(ERP_DIR, r, 'page.tsx')), r).toBe(true)
    }
  })

  it('Wave D: the 7 accounts/inventory item routes are live with [id] view routes (except the 2 ledger-only ops)', () => {
    const waveDItems = [
      '/accounts/invoice', '/accounts/debit-note', '/accounts/payments',
      '/accounts/journal', '/costing/cost-sheet', '/inventory/adjustment', '/inventory/transfer',
    ]
    for (const r of waveDItems) {
      expect(LIVE_ROUTES.has(r), r).toBe(true)
      expect(isLive(findItemByRoute(r)!), r).toBe(true)
    }
    // view routes for the doc-model ops (adjustment/transfer: ledger rows are the record — none)
    const waveDViews = [
      '/accounts/invoice/[id]', '/accounts/debit-note/[id]', '/accounts/payments/[id]',
      '/accounts/journal/[id]', '/costing/cost-sheet/[id]',
    ]
    for (const r of waveDViews) {
      expect(LIVE_ROUTES.has(r), r).toBe(true)
      expect(fs.existsSync(path.join(ERP_DIR, r, 'page.tsx')), r).toBe(true)
    }
    // the two NEW tools are wired to their items (post_stock_adjustment / transfer_stock)
    expect(findItemByRoute('/inventory/adjustment')!.agentTools).toContain('post_stock_adjustment')
    expect(findItemByRoute('/inventory/transfer')!.agentTools).toContain('transfer_stock')
  })

  it('items with agentTools have an agentPrompt or are live', () => {
    for (const item of MENU_ITEMS) {
      if (item.agentTools.length > 0 && !isLive(item)) {
        expect(item.agentPrompt, `agentPrompt missing for ${item.id}`).toBeTruthy()
      }
    }
  })

  it('lookups: findItemByRoute / findGroupByLanding / findGroupByRoutePrefix', () => {
    expect(findItemByRoute('/procurement/grn')?.id).toBe('grn-entry')
    expect(findItemByRoute('/nope')).toBeUndefined()
    expect(findGroupByLanding('/procurement')?.id).toBe('procurement')
    expect(findGroupByRoutePrefix('/procurement/grn')?.id).toBe('procurement')
    expect(findGroupByRoutePrefix('/coming/programs')?.id).toBe('programs')
    expect(findGroupByRoutePrefix('/coming/grn-entry')?.id).toBe('procurement')
    expect(groupLandingHref(findGroupById('orders')!)).toBe('/orders')
    expect(groupLandingHref(findGroupById('pieces')!)).toBe('/pieces/despatch')
    expect(groupLandingHref(findGroupById('programs')!)).toBe('/programs/new')
    expect(groupLandingHref(findGroupById('jobwork')!)).toBe('/jobwork/order')
    expect(findItemById('order-hub')?.groupId).toBe('orders')
  })

  it('Wave A (M5): the 7 money/rates items are live with pages + tool doors (SPEC-M5 §7-A)', () => {
    const waveA = [
      { route: '/costing/budget', id: 'budget', tool: 'create_budget' },
      { route: '/orders/commercial-invoice', id: 'commercial-invoice', tool: 'create_commercial_invoice' },
      { route: '/accounts/invoice/local', id: 'local-invoice', tool: 'create_sales_invoice' },
      { route: '/accounts/invoice/piece', id: 'piece-jobwork-invoice', tool: 'create_sales_invoice' },
      { route: '/procurement/supplier-orders', id: 'supplier-orders', tool: 'create_supplier_order' },
      { route: '/procurement/rate-confirmation', id: 'rate-confirmation', tool: 'list_po_rates' },
      { route: '/costing/piece-rate', id: 'piece-rate-confirmation', tool: 'list_piece_rates' },
    ]
    for (const { route, id, tool } of waveA) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain(tool)
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
    }
    // registers carry CSV routes; doc variants do not (they are not registers)
    expect(fs.existsSync(path.join(ERP_DIR, 'procurement/rate-confirmation/csv/route.ts'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'costing/piece-rate/csv/route.ts'))).toBe(true)
    // budget view page exists; the invoice variants reuse /accounts/invoice/[id]
    expect(fs.existsSync(path.join(ERP_DIR, 'costing/budget/[id]/page.tsx'))).toBe(true)
    // no pendingTools left on the Wave A fleet
    for (const { id } of waveA) {
      expect((findItemById(id) as MenuItem).pendingTools, `${id} pendingTools`).toEqual([])
    }
  })
})
