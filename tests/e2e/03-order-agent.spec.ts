/**
 * SPEC-M12 §1 path 3 + C5 — ORDER CREATE (AGENT).
 * Topbar Agent button → self-sufficient prompt (every create_order arg is in
 * the message — the M10 lesson) → the agent walks its tool chain → the
 * create_order write tool card reaches "pending approval" → Approve & Commit
 * → the order exists (register + DB truth).
 *
 * The LLM is real: generous timeouts + 1 retry (SPEC-M12 C5).
 */
import { test, expect } from '@playwright/test'
import { login, collectDefects, expectZeroDefects, e2eState, e2eDb } from './helpers'

test.setTimeout(300_000) // multi-step tool chains are slow (SPEC-M12 C5)
test.describe.configure({ retries: 1 })

test.describe('golden path 3 — order create (agent)', () => {
  test('the agent proposes create_order and the human approves the commit', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)

    // open the panel through the USER-VISIBLE door (topbar Agent button)
    await page.click('button:has-text("Agent")')
    await expect(page.getByText('Fiberpro Agent')).toBeVisible({ timeout: 30_000 })

    // self-sufficient prompt: buyer code, style, one line, qty, rate, delivery
    const prompt = `Create a sales order for buyer ${state.buyerCode} (${state.buyerName}), style ${state.styleNo}, 400 pcs in one line — colour ${state.colourName}, size ${state.sizeName}, qty 400, rate ₹100/pc — delivery date 2026-12-31.`
    await page.fill('textarea[placeholder^="Ask the agent"]', prompt)
    await page.click('button:has-text("Send")')

    // the write tool must surface a pending-approval card (240 s — LLM + tool chain)
    const pendingCard = page.locator('div.border-amber-300', { hasText: 'create_order' }).first()
    await expect(pendingCard).toBeVisible({ timeout: 240_000 })
    await expect(pendingCard.getByText('pending approval')).toBeVisible()

    // the human approves → commit
    await pendingCard.getByRole('button', { name: /Approve & Commit/i }).click()
    await expect(pendingCard.getByText('pending approval')).toBeHidden({ timeout: 60_000 })

    // the order is real: /orders register lists it
    await page.goto('/orders')
    await expect(page.locator('table').first()).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(state.buyerName).first()).toBeVisible()

    expectZeroDefects(defects)
  })

  test('DB truth: the agent-approved order is committed (400 pcs × ₹100)', async () => {
    const state = e2eState()
    const db = e2eDb()
    try {
      const order = await db.order.findFirst({
        where: { buyer: { code: state.buyerCode }, totalPcs: 400 },
        orderBy: { createdAt: 'desc' },
      })
      if (!order) throw new Error('E2E: the agent-committed order row was not found')
      expect(order.totalValue).toBe(40000)
      expect(order.orderNo).toMatch(/^SO-/)
    } finally {
      await db.$disconnect()
    }
  })
})
