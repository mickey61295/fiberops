/**
 * SPEC-M12 §1 path 6 + C5 — APPROVAL APPROVE (the human-in-the-loop door).
 * The seeded PO auto-submitted a pending Approval → /approvals shows the
 * card → the agent (real LLM) walks get_pending_approvals → approve_pending →
 * the panel's pending-approval card → Approve & Commit → the inbox no longer
 * lists it and the DB row says approved with the HUMAN's email in approvedBy
 * (the SPEC-M7 Wave B actor rule, proven end-to-end).
 */
import { test, expect } from '@playwright/test'
import { login, collectDefects, expectZeroDefects, e2eState, e2eDb } from './helpers'

test.setTimeout(300_000) // multi-step tool chains are slow (SPEC-M12 C5)
test.describe.configure({ retries: 1 })

test.describe('golden path 6 — approval approve', () => {
  test('the inbox shows the pending PO approval; the agent + human approve it', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)

    // the inbox lists the seeded PO approval (card shows PO No + Pending)
    await page.goto('/approvals')
    const card = page.locator('div.grid > div').filter({ hasText: state.poNo }).first()
    await expect(card).toBeVisible({ timeout: 90_000 })
    await expect(card.getByText('Pending')).toBeVisible()

    // approve THROUGH THE AGENT (the workflow view's Approve button is an
    // agent door — the golden path is panel → tool → human commit)
    await page.click('button:has-text("Agent")')
    await expect(page.getByText('Fiberpro Agent')).toBeVisible({ timeout: 30_000 })

    const prompt = `Approve the pending purchase order approval for PO ${state.poNo}. Use get_pending_approvals to find it, then approve it.`
    await page.fill('textarea[placeholder^="Ask the agent"]', prompt)
    await page.click('button:has-text("Send")')

    // approve_pending is a write tool → pending-approval card (240 s — LLM)
    const pendingCard = page.locator('div.border-amber-300', { hasText: 'approve_pending' }).first()
    await expect(pendingCard).toBeVisible({ timeout: 240_000 })
    await pendingCard.getByRole('button', { name: /Approve & Commit/i }).click()
    await expect(pendingCard.getByText('pending approval')).toBeHidden({ timeout: 60_000 })

    // the inbox (fresh load) no longer lists the card
    await page.goto('/approvals')
    const goneCard = page.locator('div.grid > div').filter({ hasText: state.poNo }).first()
    await expect(goneCard).toBeHidden({ timeout: 90_000 })

    expectZeroDefects(defects)
  })

  test('DB truth: approval row approved with the human actor stamped', async () => {
    const state = e2eState()
    const db = e2eDb()
    try {
      const approval = await db.approval.findUnique({ where: { id: state.approvalId } })
      if (!approval) throw new Error('E2E: the approval row was not found')
      expect(approval.status).toBe('approved')
      expect(approval.approvedBy).toBe(state.admin.email) // the human, not 'agent'
      expect(approval.approvedAt).not.toBeNull()
    } finally {
      await db.$disconnect()
    }
  })
})
