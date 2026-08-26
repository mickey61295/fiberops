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

  it('parityStats: 17 live items of 113 after M3 Wave C (+11 chain screens); 14/17 groups', () => {
    const s = parityStats()
    expect(s.totalItems).toBe(113)
    expect(s.liveItems).toBe(17)
    expect(s.comingItems).toBe(96)
    expect(s.liveGroups).toBe(14)
    expect(s.legacyLive).toBeGreaterThan(0)
    expect(s.coveragePct).toBeGreaterThan(0)
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
})
