/**
 * SPEC-M61 H1 — E-10 tool authorization (harness-authz).
 *
 * The harness authenticated but never authorized: this suite pins the three
 * doors that now enforce rights:
 *  1. every write tool declares a non-null requiredRight (the mapping gate —
 *     a new write domain without a DOMAIN_RIGHT entry FAILS here, never
 *     ships silently unauthorized);
 *  2. the manifest narrows by the caller's rights ([]/null/admin = all,
 *     ADR-018 — the same rule the shell applies to menus);
 *  3. dispatch + approval re-check (source contracts on both route layers,
 *     the hfx-batch0/chat-batch2 pattern) + money-class eligibility +
 *     selfApproved recording (E-10.4).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { allTools } from '@/lib/agent/tools'
import {
  allowedRightsSet,
  areaLabelFor,
  hasRequiredRight,
  isMoneyClass,
  manifestVisible,
  mayApproveMoneyClass,
  MONEY_RIGHT,
  requiredRightOf,
  writeToolsWithoutRights,
  DOMAIN_RIGHT,
} from '@/lib/agent/tool-rights'
import { c10_1NotPermitted, C_10_2_ROW_BLOCKED } from '@/lib/agent/copy'

const read = (rel: string) => readFileSync(rel, 'utf8')

describe('E-10.1 — every write tool declares a right', () => {
  it('writeToolsWithoutRights is EMPTY (the mapping gate)', () => {
    expect(writeToolsWithoutRights(allTools)).toEqual([])
  })

  it('read/meta doors declare null (reads stay universal)', () => {
    for (const name of ['list_buyers', 'get_stock', 'render_report', 'extract_document']) {
      const t = allTools.find((x) => x.name === name)
      expect(t, name).toBeTruthy()
      expect(requiredRightOf(t!)).toBeNull()
    }
  })

  it('the domain→group mapping lands where expected', () => {
    const by = (name: string) => allTools.find((x) => x.name === name)!
    expect(requiredRightOf(by('create_buyer'))).toBe('masters-admin')
    expect(requiredRightOf(by('update_buyer'))).toBe('masters-admin')
    expect(requiredRightOf(by('create_order'))).toBe('orders')
    expect(requiredRightOf(by('record_payment'))).toBe('accounts')
    expect(requiredRightOf(by('create_journal'))).toBe('accounts')
    expect(requiredRightOf(by('pay_wages'))).toBe('hr')
    expect(requiredRightOf(by('receive_grn'))).toBe('procurement')
    expect(requiredRightOf(by('transfer_stock'))).toBe('inventory')
    // the money-gate override: workflow domain, accounts right
    expect(requiredRightOf(by('create_bill_pass'))).toBe('accounts')
  })

  it('every DOMAIN_RIGHT value is a real MENU_GROUPS id', () => {
    const menuSrc = read('src/lib/erp/menu-registry.ts')
    for (const right of Object.values(DOMAIN_RIGHT)) {
      if (right === null) continue
      expect(menuSrc, `group id ${right} not in MENU_GROUPS`).toContain(`id: '${right}'`)
    }
  })
})

describe('E-10.2 — hidden narrowing ([]/null = all, ADR-018)', () => {
  it('unrestricted callers see EVERY tool (rights null, [], admin)', () => {
    for (const [role, rights] of [
      ['user', null],
      ['user', []],
      ['admin', ['orders']],
    ] as const) {
      const allowed = allowedRightsSet(role, rights as string[] | null)
      expect(allTools.filter((t) => !manifestVisible(t, allowed))).toHaveLength(0)
    }
  })

  it('a rights-narrowed caller loses the write doors they lack, keeps reads', () => {
    const allowed = allowedRightsSet('user', ['orders'])
    const hidden = allTools.filter((t) => !manifestVisible(t, allowed))
    const hiddenNames = new Set(hidden.map((t) => t.name))
    expect(hiddenNames.has('create_buyer')).toBe(true) // masters-admin not granted
    expect(hiddenNames.has('record_payment')).toBe(true) // accounts not granted
    expect(hiddenNames.has('pay_wages')).toBe(true) // hr not granted
    expect(hiddenNames.has('create_order')).toBe(false) // orders granted
    expect(hiddenNames.has('update_order')).toBe(false)
    // reads stay universal (null right)
    expect(hiddenNames.has('list_buyers')).toBe(false)
    expect(hiddenNames.has('get_stock')).toBe(false)
    // 'home' is always allowed — but no tool maps to it; every write tool
    // outside orders is hidden, exactly the menu rule
    expect(hidden.length).toBeGreaterThan(0)
  })

  it('the route layer narrows the manifest (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    // SPEC-M61 H2 — the signature grew the screen pathname (E-1 tiering);
    // rights narrowing still composes inside buildToolSpecs.
    expect(route).toContain('buildToolSpecs(allowed, screenPath)')
    expect(route).toContain("import { hasRequiredRight, manifestVisible, requiredRightOf, allowedRightsSet, areaLabelFor } from '@/lib/agent/tool-rights'")
    expect(route).toContain('.filter((t) => manifestVisible(t, allowed))')
  })
})

describe('E-10.3 — dispatch re-check + approval re-check (never trust the manifest)', () => {
  it('hasRequiredRight mirrors manifestVisible (the same rule, live)', () => {
    const t = allTools.find((x) => x.name === 'create_buyer')!
    expect(hasRequiredRight(t, allowedRightsSet('user', ['orders']))).toBe(false)
    expect(hasRequiredRight(t, allowedRightsSet('user', ['masters-admin']))).toBe(true)
    expect(hasRequiredRight(t, allowedRightsSet('admin', null))).toBe(true)
  })

  it('the dispatch denial is the plain C-10.1 copy naming the area', () => {
    expect(c10_1NotPermitted(areaLabelFor('accounts'))).toBe(
      "Your role doesn't include Accounts & GST — ask an admin if you need it.",
    )
    expect(c10_1NotPermitted(areaLabelFor('hr'))).toBe(
      "Your role doesn't include HR & Payroll — ask an admin if you need it.",
    )
  })

  it('route.ts denies BEFORE execute with C-10.1 and logs the denial (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain('dispatch denial')
    expect(route).toContain('c10_1NotPermitted(areaLabelFor(right))')
    expect(route.indexOf('const right = requiredRightOf(t)')).toBeGreaterThan(0)
    expect(route.indexOf("result = { error: denial, text: denial }")).toBeGreaterThan(
      route.indexOf('const right = requiredRightOf(t)'),
    )
  })

  it('approve route re-checks at DECISION time + records selfApproved (source contract)', () => {
    const approve = read('src/app/api/agent/approve/route.ts')
    expect(approve).toContain('approval-time re-check')
    expect(approve).toContain('allowedRightsSet(guard.user.role, guard.user.rights)')
    expect(approve).toContain('c10_1NotPermitted(areaLabelFor(neededRight))')
    expect(approve).toContain('selfApproved: turn.userId === actor.userId')
  })
})

describe('E-10.4 — money-class approval eligibility + selfApproved', () => {
  const by = (name: string) => allTools.find((x) => x.name === name)!

  it('the spec\'s money list is money-class', () => {
    for (const name of [
      'record_payment', 'pay_wages', 'create_journal', 'commit_payroll_run',
      'create_bill_pass', 'cancel_payment', 'cancel_journal', 'cancel_invoice',
    ]) {
      const t = by(name)
      expect(t, name).toBeTruthy()
      expect(isMoneyClass(t), name).toBe(true)
    }
  })

  it('non-money writes are not money-class', () => {
    expect(isMoneyClass(by('create_buyer'))).toBe(false)
    expect(isMoneyClass(by('create_order'))).toBe(false)
    expect(isMoneyClass(by('transfer_stock'))).toBe(false)
  })

  it('money-class approval requires the money right (accounts)', () => {
    expect(MONEY_RIGHT).toBe('accounts')
    const without = allowedRightsSet('user', ['hr'])
    const with_ = allowedRightsSet('user', ['hr', 'accounts'])
    // pay_wages: hr dispatch right held, but money approval needs accounts
    expect(hasRequiredRight(by('pay_wages'), without)).toBe(true)
    expect(mayApproveMoneyClass(by('pay_wages'), without)).toBe(false)
    expect(mayApproveMoneyClass(by('pay_wages'), with_)).toBe(true)
    // an unrestricted approver (owner) may always approve — self-approval
    // stays possible for holders, recorded, never silent
    expect(mayApproveMoneyClass(by('record_payment'), allowedRightsSet('admin', null))).toBe(true)
  })

  it('C-10.2 (packet row blocked) is frozen exactly', () => {
    expect(C_10_2_ROW_BLOCKED).toBe('Not permitted for your role.')
  })
})
