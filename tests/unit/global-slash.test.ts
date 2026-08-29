/**
 * P0-⑧ convergence pins — the GLOBAL '/' reflex (post M17/M18 adoption).
 *
 * Race context (worklog Task 18): a parallel session shipped M17 (Operator
 * Reflex Pack ≈ my P0) + M18 (Print & Command Fidelity). Their '/' was bound
 * per-MasterTable — master screens only. Registers (the daily ledger
 * surfaces: /orders/register, /inventory/ledger, …) had NO '/'. This pins the
 * convergence port: the app-shell listener (global) + the register filter
 * bar's slashIdx opt-in (first TEXT filter, date fallback — the orders
 * register's first filter is a status select, so fi===0 would miss it).
 *
 * Source-pin style per the repo precedent (auth.test.ts readFileSync —
 * vitest runs in node; client components can't mount).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const src = (p: string) => readFileSync(`src/${p}`, 'utf8')

describe('global / reflex (P0-⑧ convergence)', () => {
  it('app-shell carries the document-level listener with data-slash targeting', () => {
    const s = src('components/erp/app-shell.tsx')
    expect(s).toContain(`e.key !== '/'`)
    expect(s).toContain('input[data-slash]')
    // guards: modifiers + already-typing
    expect(s).toContain(`e.ctrlKey || e.metaKey || e.altKey`)
    expect(s).toContain(`['INPUT', 'TEXTAREA', 'SELECT']`)
  })

  it('register filter bar opts in via slashIdx — FIRST TEXT filter, date fallback (orders register: filters[0] is a select)', () => {
    const s = src('components/erp/register-filter-bar.tsx')
    expect(s).toContain('slashIdx')
    expect(s).toContain(`fi === slashIdx ? 'q'`)
    expect(s).toContain(`fi === slashIdx ? 'from'`)
    // the heuristic list excludes every select-flavoured filter type
    expect(s).toContain(`['dateRange', 'itemType', 'status', 'select']`)
  })

  it('the M17 master-screen listener survives (both doors focus the same box — no conflict)', () => {
    const s = src('components/archetypes/master-table.tsx')
    expect(s).toContain(`e.key !== '/'`)
    expect(s).toContain('searchRef.current?.focus()')
  })

  it('every register config that has a text filter puts it in slashIdx reach (order-register smoke)', () => {
    const s = readFileSync('src/lib/erp/register-configs/order-register.ts', 'utf8')
    expect(s).toContain("key: 'q'")
  })
})
