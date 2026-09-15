/* SPEC-M61 E-10 (Revision 2, H1) — tool authorization: rights-aware
 * manifests and dispatch.
 *
 * The harness authenticated but never authorized: requireApiSession() gave
 * {userId, email, name} to every execute(), and isWrite was the only
 * classification — a logged-in storekeeper could propose (and personally
 * approve) a payroll run. This module closes that hole with ONE rights
 * model reused at three doors (never trust the manifest):
 *
 *   1. manifest  (E-10.2) — buildToolSpecs() hides tools the caller cannot use
 *   2. dispatch  (E-10.3) — route.ts re-checks requiredRight before execute()
 *   3. approval  (E-10.3/10.4) — /api/agent/approve re-checks at decision time
 *      (rights may change between proposal and approval)
 *
 * Mapping (E-10.1): requiredRight is a MENU_GROUPS id, derived from the
 * tool's domain; explicit overrides live here (one line per tool, next to
 * the domain table — the spec's "next to the tool definition" seam).
 * Read/meta doors declare null (reads stay universal).
 *
 * Back-compat is ADR-018 (the same rule the shell applies to menus):
 * rights []/null and role 'admin' → ALL groups. computeAllowedGroupIds is
 * the ONE shared implementation — this file never re-derives it.
 */
import { MENU_GROUPS } from '@/lib/erp/menu-registry'
import { computeAllowedGroupIds } from '@/lib/auth/rights'

export interface RightsBearingTool {
  name: string
  domain: string
  isWrite: boolean
}

/** Domain → MENU_GROUPS id. Read-only domains (documents/meta) → null. */
export const DOMAIN_RIGHT: Record<string, string | null> = {
  masters: 'masters-admin',
  orders: 'orders',
  procurement: 'procurement',
  inventory: 'inventory',
  cutting: 'cutting',
  production: 'production',
  jobwork: 'jobwork',
  dispatch: 'dispatch', // caught by the harness-authz mapping gate on first run
  accounting: 'accounts',
  costing: 'costing',
  hr: 'hr',
  workflow: 'approvals',
  reports: 'reports',
  documents: null, // read-only doors (extract/list)
  meta: null, // read-only doors (dashboard/live pulse)
}

/**
 * Explicit per-tool overrides (E-10.1: "explicit overrides live next to the
 * tool definition"). Workflow-domain gates that act on MONEY documents map
 * to the accounts right — a storekeeper must not pass supplier bills.
 */
export const TOOL_RIGHT_OVERRIDES: Record<string, string | null> = {
  create_bill_pass: 'accounts', // SB-#### payment gate — money, not workflow
}

/**
 * Money-class tools (E-10.4): the approver must hold the money right
 * ('accounts'). Baseline: every accounting-domain write; plus the HR/spec
 * money doors named in the spec — pay_wages, commit_payroll_run,
 * create_bill_pass. `selfApproved` (proposer === decider) is recorded on
 * every money decision: allowed (the owner is the compensating control in
 * a small firm), but visible, never silent.
 */
const MONEY_CLASS_EXPLICIT = new Set(['pay_wages', 'commit_payroll_run', 'create_bill_pass'])

/** The money right — the MENU_GROUPS id gating money-class approvals. */
export const MONEY_RIGHT = 'accounts'

/** requiredRight (E-10.1): null = no right needed (reads + meta doors). */
export function requiredRightOf(tool: RightsBearingTool): string | null {
  if (!tool.isWrite) return null
  if (tool.name in TOOL_RIGHT_OVERRIDES) return TOOL_RIGHT_OVERRIDES[tool.name]
  return DOMAIN_RIGHT[tool.domain] ?? null
}

/** Money-class test (E-10.4) — approval eligibility, distinct from requiredRight. */
export function isMoneyClass(tool: RightsBearingTool): boolean {
  if (!tool.isWrite) return false
  return MONEY_CLASS_EXPLICIT.has(tool.name) || DOMAIN_RIGHT[tool.domain] === MONEY_RIGHT
}

/** The allowed-groups set for a caller (ADR-018: [] / null / admin → all). */
export function allowedRightsSet(
  role: string | null | undefined,
  rights: string[] | null | undefined,
): Set<string> {
  return computeAllowedGroupIds({
    role,
    rights: rights ?? null,
    allGroupIds: MENU_GROUPS.map((g) => g.id),
  })
}

/** Manifest visibility (E-10.2): null right → visible; else must be allowed. */
export function manifestVisible(tool: RightsBearingTool, allowed: Set<string>): boolean {
  const right = requiredRightOf(tool)
  return right === null || allowed.has(right)
}

/** Dispatch/approval permission (E-10.3): the same rule, re-checked live. */
export function hasRequiredRight(tool: RightsBearingTool, allowed: Set<string>): boolean {
  return manifestVisible(tool, allowed)
}

/**
 * Money-class approval eligibility (E-10.4): the approver must hold the
 * money right. Applies IN ADDITION to the tool's own requiredRight.
 */
export function mayApproveMoneyClass(tool: RightsBearingTool, allowed: Set<string>): boolean {
  return !isMoneyClass(tool) || allowed.has(MONEY_RIGHT)
}

/** Human area label for the C-10.1 denial ("Accounts & GST", not "accounts"). */
export function areaLabelFor(right: string): string {
  const g = MENU_GROUPS.find((g) => g.id === right)
  return g ? g.label : right
}

/**
 * E-10.1 audit helper — the unit test (harness-authz.test.ts) asserts this
 * is EMPTY: every write tool must declare a non-null right. A new write
 * domain without a DOMAIN_RIGHT entry fails the gate instead of shipping
 * silently unauthorized.
 */
export function writeToolsWithoutRights(tools: RightsBearingTool[]): string[] {
  return tools.filter((t) => t.isWrite && requiredRightOf(t) === null).map((t) => t.name)
}
