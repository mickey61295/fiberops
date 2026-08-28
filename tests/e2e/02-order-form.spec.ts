/**
 * SPEC-M12 §1 path 2 — ORDER CREATE (FORM).
 * /orders/new DocScreen: buyer/style pickers → delivery date → one line
 * (colour picker, size picker, qty, rate) → Save & review plan → the review
 * card (plan summary + creates) → Approve & commit → the done card →
 * View document → the order view page shows the real row.
 */
import { test, expect } from '@playwright/test'
import { login, pickMaster, collectDefects, expectZeroDefects, e2eState, e2eDb } from './helpers'

test.describe('golden path 2 — order create (form)', () => {
  test('create an order through the DocScreen form and land on its view page', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)

    await page.goto('/orders/new')
    await expect(page.getByRole('heading', { name: 'Order Sheet (new)' })).toBeVisible({ timeout: 90_000 })

    // header: buyer + style pickers, delivery date (orderNo stays blank = auto SO-####)
    await pickMaster(page, 'Buyer', state.buyerCode, state.buyerCode)
    await pickMaster(page, 'Style', state.styleNo, state.styleNo)
    await page.fill('input[type=date] >> nth=1', '2026-12-31') // [0]=Order Date, [1]=Delivery Date (required)

    // line 1: colour + size pickers, qty, rate
    await pickMaster(page, 'Colour', state.colourName, state.colourName)
    await pickMaster(page, 'Size', state.sizeName, state.sizeName)
    await page.fill('input[aria-label="Qty (pcs)"]', '300')
    await page.fill('input[aria-label="Rate (₹/pc)"]', '100')
    // the live totals footer proves the line editor is alive: 300 pcs
    await expect(page.getByText('300 pcs')).toBeVisible()

    // plan → review → commit (the two-step write door)
    await page.click('button:has-text("Save & review plan")')
    const review = page.locator('div.border-amber-300')
    await expect(review).toBeVisible({ timeout: 30_000 })
    await expect(review.getByText(/Create order SO-\d+/)).toBeVisible()
    await expect(review.getByText('orderLine')).toBeVisible() // creates: order + lines

    await page.click('button:has-text("Approve & commit")')
    const done = page.locator('div.border-emerald-300')
    await expect(done).toBeVisible({ timeout: 30_000 })

    // View document → the order page
    await page.click('a:has-text("View document")')
    await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 60_000 })
    // the order view page shows the real row (buyer + the 300-pcs cell)
    await expect(page.getByText(state.buyerName).first()).toBeVisible()
    await expect(page.getByRole('cell', { name: '300' })).toBeVisible()

    expectZeroDefects(defects)
  })

  test('the committed order exists in the DB with the expected totals', async ({ page }) => {
    // DB-truth companion: the form door committed a real Order row (300 pcs × ₹100 = ₹30,000)
    await login(page, e2eState().admin.email, e2eState().admin.password)
    await page.goto('/orders/new') // establish the app context (spec isolation: login walks the real door)
    const db = e2eDb()
    try {
      const order = await db.order.findFirst({
        where: { buyer: { code: e2eState().buyerCode }, totalPcs: 300, totalValue: 30000 },
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      })
      if (!order) throw new Error('E2E: the form-committed order row was not found')
      expect(order.lines.length).toBeGreaterThanOrEqual(1)
      expect(order.orderNo).toMatch(/^SO-/)
      expect(order.status).toBe('open')
    } finally {
      await db.$disconnect()
    }
  })
})
