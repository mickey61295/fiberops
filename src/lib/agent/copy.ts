/* SPEC-M61 §2.6 + §7.5 — the frozen copy deck.
 *
 * The ONLY words operators see on M61 surfaces. Plain business language,
 * Indian English, ₹ with lakh/crore grouping, document numbers not ids —
 * never "tool", "JSON", "system", "error code" (§2.6 tone rules).
 *
 * Shape (decision 7.5): a frozen TYPED object — zero runtime deps, zero
 * lookups, snapshot-tested (tests/unit/harness-copy.test.ts pins the §2.6
 * keys). At H5 the module becomes messages/en.json keys under next-intl;
 * this file is the exact seam that swap replaces, so every string lives
 * here and nowhere else (no mobile-only strings, no panel literals).
 *
 * Number formatting is ALWAYS explicit en-IN (the default-locale pitfall:
 * Indian devices would otherwise render ₹1,500,000 instead of ₹15,00,000).
 */

/** §2.6 tone rule — money always ₹ + Indian grouping, never bare decimals. */
export function formatMoneyINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

/** §2.6 tone rule — plain quantities with Indian grouping. */
export function formatQty(n: number): string {
  return n.toLocaleString('en-IN')
}

/** C-1.1 (absent capability) — one sentence + the nearest real alternative. */
export function c1_1AbsentCapability(missingAction: string, entity: string, alternativeAction: string): string {
  return `There's no way to ${missingAction} a ${entity} in the app yet. I can ${alternativeAction} instead — tell me what to change.`
}

/** C-1.2 (checking) — always followed by the plan or the honest answer. */
export const C_1_2_CHECKING = "Let me check what's possible…"

/** C-1.3 (bulk acknowledged). */
export function c1_3BulkAcknowledged(count: number, entity: string): string {
  return `I'll prepare updates for all ${formatQty(count)} ${entity} and show them as one review.`
}

/** C-2.1 (duplicate warning, Band A — normalized-exact name match). */
export function c2_1DuplicateWarning(entity: string, name: string, code: string): string {
  return `A ${entity} named '${name}' already exists (${code}). Approving this will create a second '${name}'.`
}

/** C-2.2 (update-existing action) — the button label + the seeded instruction. */
export const C_2_2_UPDATE_EXISTING_LABEL = 'Update the existing one'
export function c2_2UpdateExistingInstruction(entity: string, code: string, change: string): string {
  return `Update ${entity} ${code} instead — ${change}`
}

/** C-2.3 (taken code) — names the owner and the two real choices. */
export function c2_3TakenCode(code: string, owner: string, entity: string): string {
  return `${code} is already used by ${owner}. I can update that ${entity}, or create a new one with the next free code.`
}

/** C-2.4 (money line). */
export function c2_4MoneyLine(amount: string, effect: string): string {
  return `${amount} — ${effect}.`
}

/** C-2.5 (plan changed). */
export const C_2_5_PLAN_CHANGED =
  "The plan changed since you looked — nothing was saved. Here's the new plan; review it and approve."

/** C-2.6 (primary labels). */
export const C_2_6_APPROVE = 'Approve & Commit'
export const C_2_6_CREATE_DUPLICATE = 'Create duplicate anyway'
export const C_2_6_REJECT = 'Reject'

/** C-3.1 (badge). */
export function c3_1Badge(count: number): string {
  return `Waiting for you: ${formatQty(count)}`
}

/** C-3.2 (expired). */
export const C_3_2_EXPIRED = 'Expired — nothing was saved. Ask me to prepare it again.'

/** C-3.3 (decided elsewhere). */
export function c3_3DecidedElsewhere(status: 'approved' | 'rejected', by: string, at: Date): string {
  const time = at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return `${status === 'approved' ? 'Approved' : 'Rejected'} by ${by} at ${time}.`
}

/** C-3.4 (reject prompt). */
export const C_3_4_REJECTED = 'Rejected — nothing was saved.'
export const C_3_4_REJECT_REASON_HINT = 'Tell me what to change (optional)'

/** C-3.5 (extend, decision 7.1 — max 3 extends then re-prepare). */
export function c3_5Extended(expiresAt: Date): string {
  return `Extended — expires ${expiresAt.toLocaleDateString('en-IN', { weekday: 'long' })} at ${expiresAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`
}
export const C_3_5_EXTEND_CAP = 'Extended 3 times — ask me to prepare it again.'

/** C-4.1 (packet title). */
export function c4_1PacketTitle(count: number, entity: string): string {
  return `${formatQty(count)} ${entity} will be updated`
}

/** C-4.2 (packet buttons). */
export function c4_2ApproveAll(count: number): string {
  return `Approve all ${formatQty(count)}`
}
export const C_4_2_APPROVE_SELECTED = 'Approve selected'
export const C_4_2_REJECT_ALL = 'Reject all'

/** C-5.1 (document notice — data, never instructions). */
export const C_5_1_DOCUMENT_NOTICE =
  "This document contains text that looks like instructions. I've treated it as data — nothing from it will be saved without your approval."

/** C-5.2 (source line). */
export function c5_2SourceLine(file: string, by: string, at: Date): string {
  const day = at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const time = at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return `From: ${file} (uploaded by ${by}, ${day} ${time})`
}

/** C-5.3 (check table title). */
export const C_5_3_CHECK_TABLE_TITLE = 'Check these numbers before I prepare anything'

/** C-5.4 (mismatch — ask, never silently correct). */
export function c5_4Mismatch(sumLabel: string, sum: string, docLabel: string, doc: string): string {
  return `The ${sumLabel} add up to ${sum} but the document says ${doc}. Which is right?`
}

/** C-6.1 (where are we). */
export const C_6_1_WHERE_ARE_WE_EXAMPLE =
  'Masters: 2 of 3 approved · Orders: waiting for your approval. Next: approve the style master.'

/** C-6.2 (worklist title). */
export const C_6_2_WORKLIST_TITLE = "This job's progress"

/** C-7.1 (audit line). */
export function c7_1AuditLine(proposedBy: string, decision: string, by: string, at: Date): string {
  const day = at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const time = at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return `Proposed by ${proposedBy} · ${decision} by ${by} · ${day} ${time}`
}

/** C-10.1 (not permitted — the E-10 denial, plain words, names the area). */
export function c10_1NotPermitted(area: string): string {
  return `Your role doesn't include ${area} — ask an admin if you need it.`
}

/** C-10.2 (packet row blocked). */
export const C_10_2_ROW_BLOCKED = 'Not permitted for your role.'

/** Band B duplicate note (decision 7.2 — fuzzy match, softer than C-2.1). */
export function duplicateSimilarNote(entity: string, name: string, code: string): string {
  return `There's a similar ${entity} '${name}' (${code}) — same one?`
}

/** The plan-warning chip prefix shown on the card (amber band, O-2.2). */
export const WARN_DUPLICATE_BAND_A = 'bandA'
export const WARN_DUPLICATE_BAND_B = 'bandB'
