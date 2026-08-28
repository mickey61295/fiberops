/**
 * SPEC-M12 §1 path 1 — LOGIN.
 * Wrong password → the red error card, stays on /login.
 * Correct password → lands inside the app (dashboard).
 */
import { test, expect } from '@playwright/test'
import { login, collectDefects, expectZeroDefects, e2eState } from './helpers'

test.describe('golden path 1 — login', () => {
  test('wrong password is rejected with the error card', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'FiberOps ERP' })).toBeVisible()
    await page.fill('#email', state.admin.email)
    await page.fill('#password', 'definitely-wrong-password')
    await page.click('button[type=submit]')
    await expect(page.locator('p.border-red-200')).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/\/login/)
    // the wrong-password 401 is THIS TEST'S INTENT — declare it allowed
    expectZeroDefects(defects, [/status of 401/])
  })

  test('correct password lands in the app', async ({ page }) => {
    const defects = collectDefects(page)
    const state = e2eState()
    await login(page, state.admin.email, state.admin.password)
    // the (erp) dashboard — the first allowed landing for an admin
    await expect(page).toHaveURL((u) => !u.pathname.startsWith('/login'))
    await expect(page.getByRole('heading', { name: 'Welcome to Fiberpro ERP' })).toBeVisible({ timeout: 60_000 })
    expectZeroDefects(defects)
  })
})
