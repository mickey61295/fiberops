/**
 * P0 KEYBOARD-REFLEX pins (GAP-ANALYSIS-FIBERPRO §6 conflicts #1/#2/#5/#8 +
 * §7-T terminology — the Tirupur muscle-memory fixes, 2026-08).
 *
 * What is pinned here:
 *  - SLUG_PRINT_DOC: every slug→docType pair resolves against the REAL print
 *    registry (a stale pair = a broken post-commit Print button / F9).
 *  - 'order' is deliberately absent (order-sheet print = the M13 gap; the pin
 *    keeps the gap honest instead of silently wiring a 404).
 *  - localTodayISO / initialHeader: date fields default to TODAY (reflex #5),
 *    local-time not UTC (the 05:30 IST boundary), prefill still wins.
 *  - menu group label spelling 'Despatch & Logistics' (reflex: terminology).
 *  - Source-level pins (the repo's auth.test.ts readFileSync precedent —
 *    vitest runs in node, components can't mount): the Enter-swallow + F-key
 *    handlers exist in doc-screen; the keyboard rows exist in register-rows
 *    and master-table; the global '/' listener + data-slash in app-shell;
 *    breadcrumbs say Despatch.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { SLUG_PRINT_DOC, localTodayISO, initialHeader } from '@/components/archetypes/doc-screen'
import { PRINT_DOCS } from '@/lib/erp/print'
import { MENU_GROUPS } from '@/lib/erp/menu-registry'

const src = (p: string) => readFileSync(`src/${p}`, 'utf8')

describe('P0-④ SLUG_PRINT_DOC — post-commit print door', () => {
  it('every mapped docType exists in the PRINT_DOCS registry (no 404 CTAs)', () => {
    for (const [slug, docType] of Object.entries(SLUG_PRINT_DOC)) {
      expect(PRINT_DOCS[docType], `${slug} → ${docType}`).toBeDefined()
    }
  })

  it('covers the 5 print-critical families', () => {
    expect(SLUG_PRINT_DOC.invoice).toBe('invoice')
    expect(SLUG_PRINT_DOC['purchase-order']).toBe('po')
    expect(SLUG_PRINT_DOC.grn).toBe('grn')
    expect(SLUG_PRINT_DOC.payment).toBe('payment')
    expect(SLUG_PRINT_DOC['dc-entry']).toBe('dc')
  })

  it("'order' is deliberately unmapped — the order-sheet print gap stays honest (M13)", () => {
    expect(SLUG_PRINT_DOC.order).toBeUndefined()
    expect(PRINT_DOCS.order).toBeUndefined()
  })
})

describe('P0-③ date default today (reflex #5)', () => {
  it('localTodayISO is YYYY-MM-DD', () => {
    expect(localTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('localTodayISO is LOCAL, not UTC (the 05:30 IST boundary)', () => {
    const expected = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    expect(localTodayISO()).toBe(expected)
  })

  it('initialHeader: date fields default to today, others blank, prefill wins', () => {
    const config = {
      docType: 't', slug: 't', title: 'T',
      headerFields: [
        { name: 'docDate', label: 'Date', type: 'date' as const },
        { name: 'partyCode', label: 'Party', type: 'text' as const },
      ],
      listColumns: [],
      agentTools: [],
    }
    const h = initialHeader(config)
    expect(h.docDate).toBe(localTodayISO())
    expect(h.partyCode).toBe('')
    const p = initialHeader(config, { docDate: '2025-05-19', partyCode: 'PRT-0001' })
    expect(p.docDate).toBe('2025-05-19')
    expect(p.partyCode).toBe('PRT-0001')
  })
})

describe('P0-⑥ Despatch terminology (reflex: §7-T)', () => {
  it("menu group label is 'Despatch & Logistics'", () => {
    const g = MENU_GROUPS.find((x) => x.id === 'dispatch')
    expect(g?.label).toBe('Despatch & Logistics')
  })

  it('dispatch page breadcrumbs say Despatch (7 routes)', () => {
    const pages = [
      'app/(erp)/dispatch/dc/page.tsx',
      'app/(erp)/dispatch/dc/process/page.tsx',
      'app/(erp)/dispatch/dc-return/page.tsx',
      'app/(erp)/dispatch/gate-entry/page.tsx',
      'app/(erp)/dispatch/gate-pass/page.tsx',
      'app/(erp)/dispatch/loading/page.tsx',
      'app/(erp)/dispatch/courier/page.tsx',
    ]
    for (const p of pages) {
      expect(src(p), p).toContain('label="Despatch"')
      expect(src(p), p).not.toContain('label="Dispatch"')
    }
  })
})

describe('P0-①② doc-screen keyboard reflexes (source pins)', () => {
  const s = src('components/archetypes/doc-screen.tsx')

  it('Enter never implicit-submits: the form keydown swallows Enter on INPUTs', () => {
    expect(s).toContain(`if (e.key !== 'Enter' || e.defaultPrevented`)
    expect(s).toContain('e.preventDefault()')
  })

  it('Enter on the last row spawns the next row (pendingFocus walk)', () => {
    expect(s).toContain('pendingFocus.current = { r: ri + 1, c: firstEditableCol }')
  })

  it('F2 save / F4 next-field / F9 print / Esc back-to-edit are wired', () => {
    expect(s).toContain(`e.key === 'F2'`)
    expect(s).toContain(`e.key === 'F4'`)
    expect(s).toContain(`e.key === 'F9'`)
    expect(s).toContain(`e.key === 'Escape' && phase === 'review'`)
  })

  it('line cells carry data-cell coordinates for the focus walk', () => {
    expect(s).toContain('data-cell={`${i}-${ci}`}')
  })

  it('post-commit card carries the Print CTA over the print route', () => {
    expect(s).toContain('printUrl')
    expect(s).toContain('/print/${printDocType}/')
  })

  it('tool-name chips are gone from the operator surface (P0-⑦)', () => {
    expect(s).not.toContain('config.agentTools.map((t) => (')
  })
})

describe('P0-⑤ keyboard-navigable tables (source pins)', () => {
  it('register-rows: row click + arrows + Enter open rows', () => {
    const s = src('components/erp/register-rows.tsx')
    expect(s).toContain(`e.key === 'ArrowDown'`)
    expect(s).toContain(`e.key === 'ArrowUp'`)
    expect(s).toContain(`e.key === 'Enter'`)
    expect(s).toContain('router.push(row.href)')
  })

  it('register-screen delegates its tbody to RegisterRows', () => {
    const s = src('components/archetypes/register-screen.tsx')
    expect(s).toContain('<RegisterRows rows={result.rows} columns={config.columns} />')
    expect(s).not.toContain("Agent door:")
  })

  it('master-table: row cursor with Enter → edit', () => {
    const s = src('components/archetypes/master-table.tsx')
    expect(s).toContain('useRowCursor')
    expect(s).toContain(`e.key === 'Enter'`)
  })
})

describe('P0-⑧ global / jump (source pins)', () => {
  it('app-shell listens for bare / and focuses data-slash targets', () => {
    const s = src('components/erp/app-shell.tsx')
    expect(s).toContain(`e.key !== '/'`)
    expect(s).toContain('input[data-slash]')
  })

  it('master search + register filter inputs opt in via data-slash (first text filter, date fallback)', () => {
    expect(src('components/archetypes/master-table.tsx')).toContain('data-slash="search"')
    const fb = src('components/erp/register-filter-bar.tsx')
    expect(fb).toContain(`fi === slashIdx ? 'from'`)
    expect(fb).toContain(`fi === slashIdx ? 'q'`)
    expect(fb).toContain('slashIdx')
  })

  it('pickers expose data-filled for the F4 next-empty-field walk', () => {
    expect(src('components/erp/doc-picker.tsx')).toContain('data-picker-trigger')
    expect(src('components/erp/doc-picker.tsx')).toContain('data-filled')
  })
})
