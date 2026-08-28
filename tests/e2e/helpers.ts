/**
 * SPEC-M12 C3/C5/C6 — shared E2E helpers.
 *
 * - login(): every spec walks the REAL /login form (golden path #1, repeated
 *   honestly — no storageState shortcuts).
 * - pickMaster(): the DocPicker interaction (trigger button → debounced
 *   search feed → option click).
 * - Defects: zero pageerror + zero console 'error' per page (the M9-M11
 *   browser-verification bar, made permanent).
 * - e2eDb(): PrismaClient pinned to db/e2e.db for DB-truth assertions.
 */
import { type Page, type ConsoleMessage } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface E2EState {
  admin: { email: string; password: string }
  restricted: { email: string; password: string }
  buyerCode: string
  buyerName: string
  styleNo: string
  colourName: string
  sizeName: string
  partyCode: string
  partyName: string
  yarnCode: string
  godownCode: string
  orderNo: string
  orderId: string
  invoiceNo: string
  invoiceId: string
  billAmount: number
  poNo: string
  poId: string
  approvalId: string
}

const STATE_PATH = resolve(process.cwd(), 'tests/e2e/.e2e-state.json')

export function e2eState(): E2EState {
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as E2EState
}

/** DB-truth client — pinned to the disposable copy (never the dev DB). */
export function e2eDb(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: 'file:/home/z/my-project/db/e2e.db' } },
  })
}

/** Golden path #1, walked by every spec. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  // first navigation compiles the target route on demand — allow time
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 })
}

/**
 * DocPicker driver: click the trigger (aria-label = field label), wait for
 * the debounced feed, click the option whose label contains `match`.
 */
export async function pickMaster(page: Page, label: string, query: string, match: string): Promise<void> {
  await page.click(`button[aria-label="${label}"]`)
  const dropdown = page.locator('div.absolute.z-50')
  await dropdown.waitFor({ state: 'visible', timeout: 15_000 })
  const search = dropdown.locator('input')
  await search.fill(query)
  // 220 ms debounce + fetch — the option appears when the feed answers
  const option = dropdown.locator('button', { hasText: match }).first()
  await option.waitFor({ state: 'visible', timeout: 20_000 })
  await option.click()
  await dropdown.waitFor({ state: 'hidden', timeout: 10_000 })
}

/** Zero-defect collector: attach BEFORE navigating. */
export interface Defects {
  pageErrors: string[]
  consoleErrors: string[]
}

export function collectDefects(page: Page): Defects {
  const defects: Defects = { pageErrors: [], consoleErrors: [] }
  page.on('pageerror', (err) => defects.pageErrors.push(String(err)))
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') defects.consoleErrors.push(msg.text())
  })
  return defects
}

/** Assert the zero-defect bar (SPEC-M12 C6). */
export function expectZeroDefects(defects: Defects, allowed: RegExp[] = []): void {
  // Turbopack dev-mode noise is excluded explicitly and honestly:
  // Fast Refresh preamble logs land as console.error in some dev builds.
  // `allowed` declares the negative-test outcomes whose browser-resource
  // errors are INTENDED (e.g. the wrong-password spec EXPECTS the 401) —
  // everything else must be zero.
  const realConsole = defects.consoleErrors.filter(
    (t) =>
      !t.includes('[Fast Refresh]') &&
      !t.includes('Download the React DevTools') &&
      !allowed.some((re) => re.test(t)),
  )
  if (defects.pageErrors.length > 0 || realConsole.length > 0) {
    throw new Error(
      `Defects detected — pageErrors: ${JSON.stringify(defects.pageErrors)} consoleErrors: ${JSON.stringify(realConsole)}`,
    )
  }
}
