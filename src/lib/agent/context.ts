/* eslint-disable @typescript-eslint/no-explicit-any */
/* CHAT-02 (Phase-6B Batch 2, SPEC-M38 §1) — the dynamic context line.
 *
 * The agent brain used to get ZERO dynamic context: no date, no user, no FY,
 * no screen (route.ts:231-239 assembled SYSTEM_PROMPT + verbatim history,
 * nothing else) — while the prompt hard-coded '26-27' and G1–G3 prose that
 * went stale the day the FY flipped. One dynamic system line, appended after
 * SYSTEM_PROMPT, now carries:
 *
 *   today (IST) + weekday · user name + role · activeFinYear() ·
 *   active screen (menu title + docNo when on a doc route) · godown roster
 *
 * "what's today?" and "yesterday's production" resolve correctly because the
 * model can SEE the date. The screen line is what makes screen-aware answers
 * possible (owner issue 3) — and it replaces the two hard-coded §7.3/§7.4
 * prompt lines (CHAT-11).
 *
 * Pure (db-free) pieces are split out for unit tests; the db-backed pieces
 * are one findMany each and fail soft (godowns line simply drops on error).
 */
import { db } from '@/lib/db'
import { istDateStr } from '@/lib/erp/dates'
import { activeFinYear, fyCodeToday } from '@/lib/erp/numbering'
import { findItemByRoute, findGroupByRoutePrefix, findGroupByLanding } from '@/lib/erp/menu-registry'

export interface ScreenContext {
  pathname?: string
  docNo?: string
}

/** Doc-number-ish trailing path segment: SO-1042, GRN-0007, 1042… */
export function extractDocNoFromPath(pathname: string): string | undefined {
  const seg = pathname.split('/').filter(Boolean).pop()
  if (!seg) return undefined
  if (/^[A-Za-z]{1,4}-\d{1,8}$/.test(seg)) return seg.toUpperCase()
  if (/^\d{3,8}$/.test(seg)) return seg // bare order numbers (LPP-style 11135903)
  return undefined
}

/** Resolve the human screen title for a pathname (menu item → parent item → group → path). */
export function screenTitle(pathname: string): string {
  const item = findItemByRoute(pathname)
  if (item) return item.label
  // [id] routes: strip the trailing segment and retry (e.g. /orders/SO-1001 → /orders)
  const parent = pathname.slice(0, pathname.lastIndexOf('/'))
  const parentItem = parent ? findItemByRoute(parent) : undefined
  if (parentItem) return parentItem.label
  const group = findGroupByRoutePrefix(pathname) ?? findGroupByLanding(pathname)
  if (group) return group.label
  return pathname
}

/**
 * The full dynamic line, db-backed. Pure string assembly happens in
 * formatContextLine so tests can pin it without touching the DB.
 */
export async function buildDynamicContext(
  screen: ScreenContext | undefined,
  actor: { name?: string | null; email?: string | null; role?: string | null },
): Promise<string> {
  const today = istDateStr(new Date())
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getUTCDay()]
  const fy = await activeFinYear().catch(() => fyCodeToday())
  let godowns: { code: string; name: string }[] = []
  try {
    godowns = await db.godown.findMany({ select: { code: true, name: true }, orderBy: { code: 'asc' } })
  } catch {
    godowns = []
  }
  const path = screen?.pathname?.trim() || ''
  const docNo = (screen?.docNo?.trim() || (path ? extractDocNoFromPath(path) : undefined)) || undefined
  const title = path ? screenTitle(path) : ''
  return formatContextLine({ today, weekday, user: actor.name || actor.email || 'user', role: actor.role || undefined, fy, screenTitle: title, docNo, godowns })
}

/** Pure formatter — the unit-test seam. */
export function formatContextLine(parts: {
  today: string
  weekday: string
  user: string
  role?: string
  fy: string
  screenTitle?: string
  docNo?: string
  godowns: { code: string; name: string }[]
}): string {
  const who = parts.role ? `${parts.user} (${parts.role})` : parts.user
  const where = parts.screenTitle
    ? ` | screen: ${parts.screenTitle}${parts.docNo ? ` — ${parts.docNo}` : ''}`
    : ''
  const g = parts.godowns.length
    ? ` | godowns: ${parts.godowns.map((x) => `${x.code}=${x.name}`).join(', ')}`
    : ''
  return `[CONTEXT] today is ${parts.weekday} ${parts.today} (IST) | user: ${who} | financial year: ${parts.fy}${where}${g}`
}
