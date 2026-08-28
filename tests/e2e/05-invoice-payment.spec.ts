/**
 * SPEC-M12 §1 path 5 — INVOICE→PAYMENT (the collection stage, chain step 15).
 * A seeded invoice (₹1,050 — order E2E + 5% GST) → /accounts/payments?invoice=
 * prefills the invoice number → party picker, amount 1050, direction in,
 * mode bank → review (shows "invoice INV-… (₹1050)" + the settle update) →
 * commit → the invoice view page flips to status: paid.
 */
import { test, expect } from '@playwright/test'
import { login, pickMaster, collectDefects, expectZeroDefects, e2eState, e2eDb } from './helpers'

test.describe('golden path 5 — invoice→payment', () => {
  test('record a receipt that settles the seeded invoice', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)

    await page.goto(`/accounts/payments?invoice=${encodeURIComponent(state.invoiceNo)}`)
    await expect(page.getByRole('heading', { name: /Payment \/ Receipt/i }).first()).toBeVisible({ timeout: 90_000 })
    // ?invoice= prefills the Invoice No field (header input DOM order:
    // voucherNo(0), amount(1), invoiceNo(2))
    await expect(page.locator('input').nth(2)).toHaveValue(state.invoiceNo)

    await pickMaster(page, 'Party', state.partyCode, state.partyCode)
    // amount = the only number input in the payment header
    await page.fill('input[type=number]', String(state.billAmount))
    // direction: Receipt (in from buyer); mode: Bank — both header selects
    await page.selectOption('select >> nth=0', 'in')
    await page.selectOption('select >> nth=1', 'bank')

    await page.click('button:has-text("Save & review plan")')
    const review = page.locator('div.border-amber-300')
    await expect(review).toBeVisible({ timeout: 30_000 })
    await expect(review.getByText(new RegExp(`invoice ${state.invoiceNo}`)).first()).toBeVisible()
    // the settle side effect is in the plan: 1 update (salesInvoice → paid)
    await expect(review.getByText(/Updates: 1 record/)).toBeVisible()

    await page.click('button:has-text("Approve & commit")')
    const done = page.locator('div.border-emerald-300')
    await expect(done).toBeVisible({ timeout: 30_000 })

    // the invoice view page now shows the settled status
    await page.goto(`/accounts/invoice/${encodeURIComponent(state.invoiceNo)}`)
    await expect(page.getByText(`status: paid`, { exact: false })).toBeVisible({ timeout: 90_000 })

    expectZeroDefects(defects)
  })

  test('DB truth: the payment row exists and the invoice is paid', async () => {
    const state = e2eState()
    const db = e2eDb()
    try {
      const payment = await db.payment.findFirst({
        where: { invoiceId: state.invoiceId, amount: state.billAmount, direction: 'in' },
        orderBy: { createdAt: 'desc' },
      })
      if (!payment) throw new Error('E2E: the settling payment row was not committed')
      expect(payment.voucherNo).toMatch(/^RCP-/)
      const invoice = await db.salesInvoice.findUnique({ where: { invoiceNo: state.invoiceNo } })
      expect(invoice?.status).toBe('paid')
    } finally {
      await db.$disconnect()
    }
  })
})
