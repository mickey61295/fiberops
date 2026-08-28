/**
 * SPEC-M12 §1 path 8 — RIGHTS DENIAL (SPEC-M7 Wave C, the two-layer rule).
 * The restricted merchandiser (group 'E2E Rights' → rights ['orders']):
 *   - /accounts (NOT in their groups) → 307-redirects to the first allowed
 *     landing ('/') — the edge middleware layer
 *   - /orders (allowed) → 200 — the allow control that keeps the deny test
 *     honest (a redirect here would mean the guard over-blocks)
 */
import { test, expect } from '@playwright/test'
import { login, collectDefects, expectZeroDefects, e2eState } from './helpers'

test.describe('golden path 8 — rights denial', () => {
  test('a denied route redirects to the first allowed landing; an allowed route loads', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.restricted.email, state.restricted.password)

    // DENY: /accounts belongs to no allowed group → redirect to '/'
    await page.goto('/accounts')
    await page.waitForURL((u) => u.pathname === '/', { timeout: 60_000 })
    await expect(page.getByRole('heading', { name: 'Welcome to Fiberpro ERP' })).toBeVisible({ timeout: 60_000 })

    // ALLOW (control): the orders register is in their rights
    await page.goto('/orders')
    await expect(page.locator('table').first()).toBeVisible({ timeout: 90_000 })
    await expect(page).toHaveURL(/\/orders/)

    expectZeroDefects(defects)
  })
})
