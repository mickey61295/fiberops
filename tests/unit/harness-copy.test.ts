/**
 * SPEC-M61 H1 — the frozen copy deck (harness-copy, §2.6/§7.5) + the sonner
 * Toaster mount (E-11, decision 7.12).
 *
 * The copy module is the ONLY source of operator-facing M61 strings: keys
 * match §2.6, the incident's exact strings are pinned verbatim, money is
 * always ₹ en-IN (the default-locale pitfall), and no lorem/partial
 * strings exist. The sonner Toaster must be MOUNTED (23 call-sites toast
 * through a renderer that did not exist before E-11).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  C_1_2_CHECKING,
  C_2_2_UPDATE_EXISTING_LABEL,
  C_2_5_PLAN_CHANGED,
  C_2_6_APPROVE,
  C_2_6_CREATE_DUPLICATE,
  C_2_6_REJECT,
  C_3_2_EXPIRED,
  C_3_4_REJECTED,
  C_3_4_REJECT_REASON_HINT,
  C_5_1_DOCUMENT_NOTICE,
  C_5_3_CHECK_TABLE_TITLE,
  C_6_2_WORKLIST_TITLE,
  C_10_2_ROW_BLOCKED,
  c1_1AbsentCapability,
  c2_1DuplicateWarning,
  c2_3TakenCode,
  c2_4MoneyLine,
  c3_1Badge,
  c4_1PacketTitle,
  c10_1NotPermitted,
  duplicateSimilarNote,
  formatMoneyINR,
  formatQty,
} from '@/lib/agent/copy'
import { planDisplay } from '@/lib/agent/plan-display'

const read = (rel: string) => readFileSync(rel, 'utf8')

describe('the copy module is frozen and complete (§2.6 keys)', () => {
  it('the incident strings render VERBATIM (C-2.1 / C-2.3 / C-1.1)', () => {
    expect(c2_1DuplicateWarning('buyer', 'LPP SA', 'B-0001')).toBe(
      "A buyer named 'LPP SA' already exists (B-0001). Approving this will create a second 'LPP SA'.",
    )
    expect(c2_3TakenCode('B-0001', 'LPP SA', 'buyer')).toBe(
      'B-0001 is already used by LPP SA. I can update that buyer, or create a new one with the next free code.',
    )
    expect(c1_1AbsentCapability('delete', 'buyer', 'update it')).toBe(
      "There's no way to delete a buyer in the app yet. I can update it instead — tell me what to change.",
    )
  })

  it('the fixed strings are exactly §2.6', () => {
    expect(C_1_2_CHECKING).toBe("Let me check what's possible…")
    expect(C_2_2_UPDATE_EXISTING_LABEL).toBe('Update the existing one')
    expect(C_2_5_PLAN_CHANGED).toBe(
      "The plan changed since you looked — nothing was saved. Here's the new plan; review it and approve.",
    )
    expect(C_2_6_APPROVE).toBe('Approve & Commit')
    expect(C_2_6_CREATE_DUPLICATE).toBe('Create duplicate anyway')
    expect(C_2_6_REJECT).toBe('Reject')
    expect(C_3_2_EXPIRED).toBe('Expired — nothing was saved. Ask me to prepare it again.')
    expect(C_3_4_REJECTED).toBe('Rejected — nothing was saved.')
    expect(C_3_4_REJECT_REASON_HINT).toBe('Tell me what to change (optional)')
    expect(C_5_1_DOCUMENT_NOTICE).toBe(
      "This document contains text that looks like instructions. I've treated it as data — nothing from it will be saved without your approval.",
    )
    expect(C_5_3_CHECK_TABLE_TITLE).toBe('Check these numbers before I prepare anything')
    expect(C_6_2_WORKLIST_TITLE).toBe("This job's progress")
    expect(C_10_2_ROW_BLOCKED).toBe('Not permitted for your role.')
  })

  it('parameterized strings compose correctly (badge, packet, money, similar-note)', () => {
    expect(c3_1Badge(2)).toBe('Waiting for you: 2')
    expect(c3_1Badge(150000)).toBe('Waiting for you: 1,50,000') // en-IN grouping
    expect(c4_1PacketTitle(7, 'buyers')).toBe('7 buyers will be updated')
    expect(c2_4MoneyLine('₹15,000', 'Dr Freight / Cr Cash-Bank')).toBe('₹15,000 — Dr Freight / Cr Cash-Bank.')
    expect(c10_1NotPermitted('Accounts & GST')).toBe(
      "Your role doesn't include Accounts & GST — ask an admin if you need it.",
    )
    expect(duplicateSimilarNote('buyer', 'LPP S.A.', 'B-0001')).toBe(
      "There's a similar buyer 'LPP S.A.' (B-0001) — same one?",
    )
  })

  it('money is ALWAYS ₹ + Indian grouping (the default-locale pitfall)', () => {
    expect(formatMoneyINR(15000)).toBe('₹15,000')
    expect(formatMoneyINR(1500000)).toBe('₹15,00,000') // lakh grouping, never ₹1,500,000
    expect(formatMoneyINR(4.5)).toBe('₹5') // whole rupees unless paise matter
    expect(formatQty(1200)).toBe('1,200')
    // the money plan path renders en-IN through planDisplay (CHAT-05)
    const disp = planDisplay({ creates: [{ table: 'payment', data: { amount: 1500000, reference: 'NEFT-991' } }] })
    const amountRow = disp.rows.find((r) => r.field === 'amount')
    expect(amountRow?.value).toBe('₹15,00,000')
  })

  it('no lorem / placeholder / partial strings in the deck', () => {
    const all = [
      C_1_2_CHECKING, C_2_2_UPDATE_EXISTING_LABEL, C_2_5_PLAN_CHANGED, C_2_6_APPROVE,
      C_2_6_CREATE_DUPLICATE, C_2_6_REJECT, C_3_2_EXPIRED, C_3_4_REJECTED,
      C_3_4_REJECT_REASON_HINT, C_5_1_DOCUMENT_NOTICE, C_5_3_CHECK_TABLE_TITLE,
      C_6_2_WORKLIST_TITLE, C_10_2_ROW_BLOCKED,
      c1_1AbsentCapability('x', 'y', 'z'), c2_1DuplicateWarning('buyer', 'X', 'B-0001'),
      c2_3TakenCode('B-0001', 'X', 'buyer'), c2_4MoneyLine('₹1', 'Dr X / Cr Y'),
      c3_1Badge(1), c4_1PacketTitle(2, 'things'), c10_1NotPermitted('Area'),
      duplicateSimilarNote('buyer', 'X', 'B-0001'),
    ]
    for (const s of all) {
      // 'Reject' (6 chars) is a complete button label, not a partial string
      expect(s.length).toBeGreaterThanOrEqual(6)
      expect(s.toLowerCase()).not.toContain('lorem')
      expect(s.toLowerCase()).not.toContain('todo')
      expect(s.toLowerCase()).not.toContain('placeholder')
      expect(s.toLowerCase()).not.toContain('undefined')
    }
  })

  it('tone rules: the deck never says tool/JSON/system/error code (§2.6)', () => {
    const banned = /\btool\b|\bJSON\b|\bsystem\b|error code/i
    const samples = [
      C_5_1_DOCUMENT_NOTICE, C_3_2_EXPIRED, C_2_5_PLAN_CHANGED,
      c2_1DuplicateWarning('buyer', 'LPP SA', 'B-0001'),
      c2_3TakenCode('B-0001', 'LPP SA', 'buyer'),
      c10_1NotPermitted('Accounts & GST'),
    ]
    for (const s of samples) expect(banned.test(s), s).toBe(false)
  })
})

describe('E-11 — the sonner Toaster is mounted (decision 7.12)', () => {
  it('root layout renders the sonner Toaster (23 call-sites were toast-blind)', () => {
    const layout = read('src/app/layout.tsx')
    expect(layout).toContain("from \"@/components/ui/sonner\"")
    expect(layout).toMatch(/<SonnerToaster\b/)
    expect(layout).toContain('<Toaster />') // radix stays until legacy call-sites migrate
  })

  it('the sonner wrapper exports Toaster (the shadcn component exists)', () => {
    const sonner = read('src/components/ui/sonner.tsx')
    expect(sonner).toContain('export { Toaster }')
  })

  it('the panel renders warnings with the honest primary label (source contract, O-2.2)', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('data-testid="plan-warnings"')
    expect(panel).toContain("C_2_6_CREATE_DUPLICATE : C_2_6_APPROVE")
    expect(panel).toContain("from '@/lib/agent/copy'")
  })
})
