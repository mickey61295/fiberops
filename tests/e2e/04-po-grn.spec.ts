/**
 * SPEC-M12 §1 path 4 — PO→GRN (the procurement cycle).
 * /procurement/po form (poType select, party picker, TYPED item picker fed by
 * the row's itemType cell) → commit → /procurement/grn?po=<poNo> (prefilled)
 * → godown + received qty → commit → the GRN lands in the recent table and
 * the stock ledger gains the purchase_grn row (DB truth).
 */
import { test, expect } from '@playwright/test'
import { login, pickMaster, collectDefects, expectZeroDefects, e2eState, e2eDb } from './helpers'

test.describe('golden path 4 — PO→GRN', () => {
  test('create a yarn PO, then receive it into the godown via GRN', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)

    // ── step 1: the PO form
    await page.goto('/procurement/po')
    await expect(page.getByRole('heading', { name: 'Purchase Order' }).first()).toBeVisible({ timeout: 90_000 })

    await page.selectOption('select >> nth=0', 'yarn') // header PO Type
    await pickMaster(page, 'Supplier (party)', state.partyCode, state.partyCode)
    // delivery date = the LAST date input (header has Order Date + Delivery Date)
    await page.locator('input[type=date]').nth(1).fill('2026-12-31')

    // line 1: item type select feeds the typed item picker
    await page.selectOption('tbody select >> nth=0', 'yarn')
    await pickMaster(page, 'Item', state.yarnCode, state.yarnCode)
    await page.fill('tbody input[aria-label="Qty"]', '120')
    await page.fill('tbody input[aria-label="Rate (₹)"]', '180')
    await expect(page.getByText('120')).toBeVisible()

    await page.click('button:has-text("Save & review plan")')
    const review = page.locator('div.border-amber-300')
    await expect(review).toBeVisible({ timeout: 30_000 })
    await expect(review.getByText(/Create PO PO-[A-Z]-\d+/)).toBeVisible()
    await page.click('button:has-text("Approve & commit")')
    const done = page.locator('div.border-emerald-300')
    await expect(done).toBeVisible({ timeout: 30_000 })

    // capture the PO number from the done card summary
    const doneText = await done.innerText()
    const poNo = doneText.match(/PO-[A-Z]-\d+/)![0] // per-type prefixes: PO-Y-008

    // ── step 2: the GRN against that PO (?po= prefills poNo — the W1 CTA)
    await page.goto(`/procurement/grn?po=${encodeURIComponent(poNo)}`)
    await expect(page.getByRole('heading', { name: /GRN/ }).first()).toBeVisible({ timeout: 90_000 })
    // the ?po= CTA prefills the PO No field (header text inputs carry no
    // aria-label — DOM-order nth is the honest contract: grnNo(0), poNo(1))
    await expect(page.locator('input').nth(1)).toHaveValue(poNo)

    await pickMaster(page, 'Godown', state.godownCode, state.godownCode)
    // the GRN form is header-only: Received Qty is its only number input
    await page.fill('input[type=number]', '120')
    await page.click('button:has-text("Save & review plan")')
    const grnReview = page.locator('div.border-amber-300')
    await expect(grnReview).toBeVisible({ timeout: 30_000 })
    await expect(grnReview.getByText(new RegExp(poNo)).first()).toBeVisible()
    await expect(grnReview.getByText('stockLedger')).toBeVisible() // the GRN's stock effect is in the plan
    await expect(grnReview.getByText('currentStock')).toBeVisible()
    await page.click('button:has-text("Approve & commit")')
    const grnDone = page.locator('div.border-emerald-300')
    await expect(grnDone).toBeVisible({ timeout: 30_000 })

    // the recent-GRNs table on the same page lists the new row
    await expect(page.getByText(poNo).first()).toBeVisible()

    expectZeroDefects(defects)
  })

  test('DB truth: GRN + stock ledger rows landed against the E2E yarn', async () => {
    const state = e2eState()
    const db = e2eDb()
    try {
      const grn = await db.gRN.findFirst({
        where: { po: { party: { code: state.partyCode } }, totalQty: 120 },
        orderBy: { createdAt: 'desc' },
        include: { po: true },
      })
      if (!grn?.po) throw new Error('E2E: the GRN row was not committed')
      expect(grn.po.poNo).toMatch(/^PO-/)
      const ledger = await db.stockLedger.findFirst({
        where: { txnType: 'purchase_grn', docNo: grn.grnNo, inKgs: 120 },
        orderBy: { createdAt: 'desc' },
      })
      if (!ledger) throw new Error('E2E: the purchase_grn stock-ledger row was not committed')
    } finally {
      await db.$disconnect()
    }
  })
})
