/**
 * Menu registry unit tests — SPEC-M1 §10.
 * Guards the frozen contract: 132 items (113 parity + M9 live-tracker +
 * M11 feature-flags + M19 ×13 registers + tally-export + M13 digest + M15 audit), 17 groups, unique ids/routes,
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
  findGroupForPath,
  parityStats,
  type MenuItem,
} from '../../src/lib/erp/menu-registry'
import { APPROVAL_KINDS } from '../../src/lib/erp/approval-kinds'

const ERP_DIR = path.resolve(__dirname, '../../src/app/(erp)')

describe('menu registry — frozen contract (SPEC-M1)', () => {
  it('has exactly 132 items (113 parity + M9 live-tracker + M11 feature-flags + M19 ×13 + tally + M13 digest + M15 audit)', () => {
    expect(MENU_ITEMS.length).toBe(132)
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

  it('isLive: dashboard + grn-entry + pcs-receipt all true (M6 Wave D — 113/113)', () => {
    expect(isLive(findItemById('dashboard') as MenuItem)).toBe(true)
    expect(isLive(findItemById('grn-entry') as MenuItem)).toBe(true)
    expect(isLive(findItemById('pcs-receipt') as MenuItem)).toBe(true)
  })

  it('M9: live-tracker item — home group, live, page on disk, get_live_activity door (SPEC-M9)', () => {
    const item = findItemById('live-tracker') as MenuItem
    expect(item.groupId).toBe('home')
    expect(item.route).toBe('/tracker')
    expect(LIVE_ROUTES.has('/tracker')).toBe(true)
    expect(isLive(item)).toBe(true)
    expect(item.agentTools).toContain('get_live_activity')
    expect(fs.existsSync(path.join(ERP_DIR, 'tracker/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, '../../app/api/tracker/route.ts'))).toBe(true)
  })

  it('M11: feature-flags item — masters-admin group, live, page on disk, list_app_options door (SPEC-M11 C4)', () => {
    const item = findItemById('feature-flags') as MenuItem
    expect(item.groupId).toBe('masters-admin')
    expect(item.route).toBe('/admin/settings')
    expect(LIVE_ROUTES.has('/admin/settings')).toBe(true)
    expect(isLive(item)).toBe(true)
    expect(item.agentTools).toContain('list_app_options')
    expect(fs.existsSync(path.join(ERP_DIR, 'admin/settings/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'admin/settings/flags-admin.tsx'))).toBe(true)
    // the admin screen resolves through the masters-admin group (rights layer)
    expect(findGroupForPath('/admin/settings')?.id).toBe('masters-admin')
  })

  it('parityStats: 132/132 live after M21 (113 parity M6 + live-tracker + feature-flags + 13 registers + tally + digest + audit)', () => {
    const s = parityStats()
    expect(s.totalItems).toBe(132)
    expect(s.liveItems).toBe(132)
    expect(s.comingItems).toBe(0)
    expect(s.liveGroups).toBe(17)
    expect(s.legacyLive).toBeGreaterThan(0)
    expect(s.coveragePct).toBeGreaterThan(0)
  })

  it('Wave A (M6): the 4 reports items are live — hub, packs, MIS, daily-pnl — with render_report door (SPEC-M6 §2 rows 1-4)', () => {
    const waveA = [
      { route: '/reports', id: 'report-hub' },
      { route: '/reports/packs', id: 'report-packs' },
      { route: '/reports/mis', id: 'mis-dashboard' },
      { route: '/costing/daily-pnl', id: 'daily-unit-pnl' },
    ]
    for (const { route, id } of waveA) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain('render_report')
      expect((findItemById(id) as MenuItem).pendingTools, `${id} pendingTools`).toEqual([])
    }
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/packs/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/mis/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/[slug]/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'reports/[slug]/csv/route.ts'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'costing/daily-pnl/page.tsx'))).toBe(true)
    // the reports group landing now points at the live hub (was /coming/reports)
    expect(findGroupById('reports')!.landingRoute).toBe('/reports')
    // the runner + csv live under the dynamic [slug] segment — covered by the
    // report-configs contract test (28-slug bijection)
  })

  it('Wave B (M6): the 5 admin/dispatch items are live — users, menu-rights, options, courier-dc, loading (SPEC-M6 §2 rows 5-9)', () => {
    const waveB = [
      { route: '/admin/users', id: 'users-groups', tool: 'create_user' },
      { route: '/admin/menu-rights', id: 'menu-rights', tool: 'update_user_group' },
      { route: '/admin/options', id: 'options-settings', tool: 'create_app_option' },
      { route: '/dispatch/courier', id: 'courier-dc', tool: 'create_courier_dc' },
      { route: '/dispatch/loading', id: 'loading', tool: 'create_loading_challan' },
    ]
    for (const { route, id, tool } of waveB) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain(tool)
      expect((findItemById(id) as MenuItem).pendingTools, `${id} pendingTools`).toEqual([])
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
    }
    // the rights matrix action rides the update_user_group master-service door
    expect(fs.existsSync(path.join(ERP_DIR, 'admin/menu-rights/actions.ts'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'admin/menu-rights/rights-matrix.tsx'))).toBe(true)
  })

  it('Wave C (M6): the 9 registers & lifecycle items are live (SPEC-M6 §2 rows 10-18)', () => {
    const waveC = [
      { route: '/orders/enquiry', id: 'order-enquiry', tool: 'list_orders' },
      { route: '/programs/status', id: 'program-status', tool: 'get_program_status' },
      { route: '/inventory/stock', id: 'stock-view', tool: 'get_stock' },
      { route: '/production/line-status', id: 'line-status', tool: 'get_line_status' },
      { route: '/orders/amendments', id: 'order-amendments', tool: 'update_order' },
      { route: '/orders/close', id: 'order-close', tool: 'close_order' },
      { route: '/programs/cancel', id: 'program-cancel', tool: 'cancel_program' },
      { route: '/programs/complete', id: 'program-complete', tool: 'complete_program' },
      { route: '/procurement/po/close', id: 'po-cancel-complete', tool: 'complete_purchase_order' },
    ]
    for (const { route, id, tool } of waveC) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain(tool)
      expect((findItemById(id) as MenuItem).pendingTools, `${id} pendingTools`).toEqual([])
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
    }
    // the two new registers carry CSV routes
    expect(fs.existsSync(path.join(ERP_DIR, 'programs/status/csv/route.ts'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'inventory/stock/csv/route.ts'))).toBe(true)
  })

  it('Wave D (M6): the 18 process-tail items are live with page files + tool doors (SPEC-M6 §2 rows 19-36 — 113/113 M6 COMPLETE)', () => {
    const waveD: { route: string; id: string; tool: string }[] = [
      { route: '/procurement/grn/multi-process', id: 'multi-process-grn', tool: 'receive_grn' },
      { route: '/procurement/grn/acceptance', id: 'grn-acceptance', tool: 'accept_grn' },
      { route: '/inventory/opening-stock', id: 'opening-stock', tool: 'post_opening' },
      { route: '/cutting/issue', id: 'cutting-issue', tool: 'create_line_issue' },
      { route: '/cutting/ready-to-cut', id: 'ready-to-cut', tool: 'ready_to_cut' },
      { route: '/cutting/production', id: 'cutting-production', tool: 'post_production_entry' },
      { route: '/cutting/ack', id: 'cutting-ack', tool: 'acknowledge_cutting_issue' },
      { route: '/pieces/receipt', id: 'pcs-receipt', tool: 'receive_jobwork' },
      { route: '/pieces/gan', id: 'pcs-grn-acceptance', tool: 'accept_jobwork_pcs' },
      { route: '/pieces/transfer', id: 'pcs-transfer', tool: 'transfer_stock' },
      { route: '/production/line-output', id: 'line-output', tool: 'post_production_entry' },
      { route: '/dispatch/dc', id: 'dc-entry', tool: 'create_dc' },
      { route: '/dispatch/dc/process', id: 'process-dc', tool: 'create_dc' },
      { route: '/dispatch/dc-return', id: 'dc-return', tool: 'receive_grn' },
      { route: '/quality/lot-approval', id: 'lot-approval', tool: 'approve_lot' },
      { route: '/accounts/hsn-gst', id: 'hsn-gst-setup', tool: 'create_hsn' },
      { route: '/hr/employees', id: 'employees', tool: 'create_employee' },
      { route: '/quality/parameters', id: 'test-parameters', tool: 'create_test_parameter' },
    ]
    expect(waveD.length).toBe(18)
    for (const { route, id, tool } of waveD) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      const item = findItemById(id) as MenuItem
      expect(item, id).toBeTruthy()
      expect(isLive(item), id).toBe(true)
      expect(item.agentTools, `${id} tool door`).toContain(tool)
      expect(item.pendingTools, `${id} pendingTools`).toEqual([])
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
    }
    // ZERO non-live items remain — the parity mission is complete
    const nonLive = MENU_ITEMS.filter((i) => !LIVE_ROUTES.has(i.route))
    expect(nonLive).toEqual([])
    // the four IN screens feed the 8-kind approval inbox (SPEC-M6 §6)
    expect(APPROVAL_KINDS.length).toBe(8)
  })

  it('Wave C (M5): the 4 approval-gate IN screens are live with kind-filtered inbox views (SPEC-M5 §6)', () => {
    const waveC = [
      { route: '/accounts/bill-pass', id: 'bill-pass', tool: 'create_bill_pass' },
      { route: '/dispatch/unit-transfer-ack', id: 'unit-transfer-ack', tool: 'acknowledge_unit_transfer' },
      { route: '/quality/reprocess-approval', id: 'reprocess-approval', tool: 'approve_reprocess' },
      { route: '/quality/non-return-dc', id: 'non-return-dc-approval', tool: 'approve_non_return_dc' },
    ]
    for (const { route, id, tool } of waveC) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      const item = findItemById(id) as MenuItem
      expect(item, id).toBeTruthy()
      expect(isLive(item)).toBe(true)
      expect(item.agentTools).toContain(tool)
      expect(item.agentTools).toContain('get_pending_approvals')
      expect(item.pendingTools).toEqual([])
    }
    // the two groups Wave C opened
    expect(findGroupById('dispatch')!.landingRoute).toBe('/dispatch/unit-transfer-ack')
    expect(findGroupById('quality')!.landingRoute).toBe('/quality/reprocess-approval')
  })

  it('Wave D (M5): the 11 ADR-015 items are live with pages + tool doors (SPEC-M5 §7-D — M5 COMPLETE)', () => {
    const waveD = [
      { route: '/orders/samples', id: 'samples-enquiry', tool: 'create_sample' },
      { route: '/dispatch/gate-entry', id: 'gate-entry', tool: 'create_gate_entry' },
      { route: '/dispatch/gate-pass', id: 'gate-pass', tool: 'create_gate_pass' },
      { route: '/pieces/packing-list', id: 'packing-list', tool: 'create_packing_list' },
      { route: '/quality/lab-tests', id: 'lab-test-entry', tool: 'create_lab_test' },
      { route: '/costing/expenses', id: 'expenses', tool: 'create_expense' },
      { route: '/hr/shifts', id: 'shifts-hours', tool: 'create_shift' },
      { route: '/accounts/production-bills', id: 'production-bills', tool: 'create_production_bill' },
      { route: '/inventory/rolls', id: 'roll-tracking', tool: 'split_roll' },
      { route: '/jobwork/contract', id: 'contract-allotment', tool: 'allot_contract' },
      { route: '/programs/allotment', id: 'fabric-acc-allotment', tool: 'create_allotment' },
    ]
    for (const { route, id, tool } of waveD) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      const item = findItemById(id) as MenuItem
      expect(item, id).toBeTruthy()
      expect(isLive(item), id).toBe(true)
      expect(item.agentTools, `${id} tool door`).toContain(tool)
      expect(item.pendingTools, id).toEqual([])
    }
    // the shift master's full tool set (MT archetype — §9: routed at /hr/shifts)
    expect((findItemById('shifts-hours') as MenuItem).agentTools).toContain('update_shift')
    expect((findItemById('shifts-hours') as MenuItem).agentTools).toContain('list_shifts')
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

  it('findGroupForPath — the SPEC-M7 Wave C rights resolver (edge middleware + layout share it)', () => {
    const f = (p: string) => findGroupForPath(p)?.id
    // exact group landings
    expect(f('/')).toBe('home')
    expect(f('/orders')).toBe('orders')
    expect(f('/accounts')).toBe('accounts')
    expect(f('/cutting')).toBe('cutting')
    // item routes under a group landing
    expect(f('/orders/new')).toBe('orders')
    expect(f('/orders/ORD-0001')).toBe('orders') // dynamic [id]
    expect(f('/accounts/invoice')).toBe('accounts')
    expect(f('/procurement/grn/GRN-0001')).toBe('procurement')
    expect(f('/masters/employee')).toBe('masters-admin')
    // item routes OUTSIDE their group landing (registers under /registers)
    expect(f('/registers/daily-in-out')).toBe('home')
    // admin screens resolve through their items → masters-admin
    expect(f('/admin/users')).toBe('masters-admin')
    expect(f('/admin/menu-rights')).toBe('masters-admin')
    expect(f('/admin/settings')).toBe('masters-admin')
    // coming pages resolve through the registry id (group or item)
    expect(f('/coming/accounts')).toBe('accounts')
    expect(f('/coming/grn-entry')).toBe('procurement')
    // meta/utility pages belong to NO group → open to any authed user
    expect(f('/parity')).toBeUndefined()
    expect(f('/nope')).toBeUndefined()
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

  it('Wave B (M5): the 14 production/pcs items are live with pages + tool doors (SPEC-M5 §7-B)', () => {
    const waveB = [
      { route: '/pieces/finished-goods', id: 'finished-goods-entry', tool: 'post_finished_goods' },
      { route: '/production/operations', id: 'operation-entry', tool: 'post_operation_entry' },
      { route: '/production/bundles', id: 'bundle-barcode', tool: 'scan_bundle' },
      { route: '/production/line-transfer', id: 'line-transfer', tool: 'transfer_line_stock' },
      { route: '/cutting/panel', id: 'panel-cutting', tool: 'create_cut_order' },
      { route: '/cutting/panel-production', id: 'panel-production', tool: 'post_production_entry' },
      { route: '/cutting/panel-excess', id: 'panel-excess', tool: 'post_production_entry' },
      { route: '/cutting/panel-rework', id: 'panel-rej-rework', tool: 'post_rejection' },
      { route: '/cutting/fab-rejection', id: 'fabric-rejection-return', tool: 'post_rejection' },
      { route: '/pieces/shortage', id: 'pcs-shortage', tool: 'post_rejection' },
      { route: '/jobwork/pcs-return', id: 'jobwork-pcs-return', tool: 'return_jobwork_pcs' },
      { route: '/costing/input', id: 'costing-input', tool: 'create_cost_sheet' },
      { route: '/hr/wages', id: 'production-wages', tool: 'get_production_wages' },
      { route: '/hr/wage-payments', id: 'wage-payments', tool: 'pay_wages' },
    ]
    for (const { route, id, tool } of waveB) {
      expect(LIVE_ROUTES.has(route), route).toBe(true)
      expect(isLive(findItemById(id) as MenuItem), id).toBe(true)
      expect((findItemById(id) as MenuItem).agentTools, `${id} tool door`).toContain(tool)
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
    }
    // the wages register carries a CSV route; the DS variants do not
    expect(fs.existsSync(path.join(ERP_DIR, 'hr/wages/csv/route.ts'))).toBe(true)
    // no pendingTools left on the Wave B fleet (scan_bundle graduated)
    for (const { id } of waveB) {
      expect((findItemById(id) as MenuItem).pendingTools, `${id} pendingTools`).toEqual([])
    }
    // the wage-bill journal door is named on the wages menu item
    expect((findItemById('production-wages') as MenuItem).agentTools).toContain('create_journal')
  })
})
