/**
 * SPEC-M12 §1 path 7 — PRINT DOOR (SPEC-M8's engine, driven by a human).
 * The seeded invoice's view page carries the Print link → /print/invoice/<no>
 * renders the A4 portrait sheet: TAX INVOICE masthead, Original copy banner,
 * the doc number, and the print-only amount block.
 */
import { test, expect } from '@playwright/test'
import { login, collectDefects, expectZeroDefects, e2eState } from './helpers'

test.describe('golden path 7 — print door', () => {
  test('the invoice view Print link opens the A4 print sheet', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)

    await page.goto(`/accounts/invoice/${encodeURIComponent(state.invoiceNo)}`)
    const printLink = page.locator('a', { hasText: 'Print' }).first()
    await expect(printLink).toBeVisible({ timeout: 90_000 })

    await printLink.click()
    await page.waitForURL(new RegExp(`/print/invoice/${state.invoiceNo}`), { timeout: 60_000 })

    // the A4 sheet: masthead title, copy banner, doc number, A4 portrait sizing
    await expect(page.getByText('TAX INVOICE', { exact: true })).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('Original', { exact: true })).toBeVisible()
    await expect(page.getByText(state.invoiceNo).first()).toBeVisible()
    // the inline @page A4 rule (SPEC-M8: inline @page beats the global
    // landscape) is present in the document's styles
    const hasA4Rule = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style')).map((s) => s.textContent ?? '')
      return styles.some((t) => /@page[^{]*\{[^}]*size:\s*A4/.test(t))
    })
    expect(hasA4Rule).toBeTruthy()

    expectZeroDefects(defects)
  })
})
