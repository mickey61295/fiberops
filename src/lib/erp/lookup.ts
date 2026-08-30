/* eslint-disable @typescript-eslint/no-explicit-any */
/* CHAT-09 (Phase-6B Batch 2, SPEC-M38 §1) — fuzzy lookup rescue.
 *
 * The buyer/party/style resolution seams matched code EXACTLY and name
 * EXACTLY (posting/order.ts:13-14) — "lpp sa", "lpp", "LPP SA " all failed
 * with a dead-end error. Now: case-insensitive code + exact-name, then
 * contains fallbacks, and when nothing matches the error lists the top-3
 * candidates ("Did you mean 'LPP SA'?") so the model can self-correct in
 * the NEXT turn instead of failing the whole plan.
 *
 * SQLite note: Prisma `contains`/`startsWith` map to LIKE (ASCII
 * case-insensitive on SQLite), but `mode: 'insensitive'` is NOT supported on
 * SQLite and `equals` is case-sensitive — so case-exactness is enforced in
 * JS after one candidate query, never via Prisma mode flags.
 */

export interface LookupCandidate {
  code: string
  name: string
}

function rank<T extends Record<string, any>>(rows: T[], query: string, codeField: string, nameField: string): T[] {
  const q = query.trim()
  const lower = q.toLowerCase()
  return [...rows].sort((a, b) => score(b, q, lower, codeField, nameField) - score(a, q, lower, codeField, nameField))
}

function score(row: Record<string, any>, q: string, lower: string, codeField: string, nameField: string): number {
  const code = String(row[codeField] ?? '')
  const name = String(row[nameField] ?? '')
  const cl = code.toLowerCase()
  const nl = name.toLowerCase()
  if (code === q) return 100
  if (name === q) return 90
  if (cl === lower || nl === lower) return 80
  if (cl.startsWith(lower)) return 70
  if (nl.startsWith(lower)) return 60
  if (nl.includes(lower) || cl.includes(lower)) return 50
  const tokens = lower.split(/\s+/).filter(Boolean)
  const hay = `${cl} ${nl}`
  return tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0)
}

/** Resolution floor: matches scoring below this are AMBIGUOUS — the caller
 * falls through to topCandidates() and asks "did you mean" instead of
 * committing the guess (a weak single-token hit on a multi-word query is
 * usually the model half-remembering a name). */
const MIN_RESOLVE_SCORE = 50

/**
 * Resolve one row by code (case-insensitive exact) or name (exact, then
 * prefix/contains), across ONE candidate query. `model` is the prisma
 * delegate (db.buyer / db.party / db.style…); code/name fields default to
 * 'code'/'name'. Returns null when nothing matches confidently — weak
 * token-only matches stay ambiguous (ask, don't guess).
 */
export async function resolveByNameOrCode<T>(
  model: any,
  query: string,
  opts: { codeField?: string; nameField?: string } = {},
): Promise<T | null> {
  const q = query.trim()
  if (!q) return null
  const codeField = opts.codeField ?? 'code'
  const nameField = opts.nameField ?? 'name'
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  // LIKE-based candidate pull (ASCII case-insensitive on SQLite),
  // code-ordered for determinism
  const rows: any[] = await model.findMany({
    where: {
      OR: tokens.flatMap((t) => [
        { [codeField]: { contains: t } },
        { [nameField]: { contains: t } },
      ]),
    },
    orderBy: { [codeField]: 'asc' },
    take: 100,
  })
  if (rows.length === 0) return null
  const best = rank(rows, q, codeField, nameField)[0]
  const s = score(best, q, q.toLowerCase(), codeField, nameField)
  return s >= MIN_RESOLVE_SCORE ? (best as T) : null
}

/** Top-N candidates for a failed lookup (best token-match first). */
export async function topCandidates(
  model: any,
  query: string,
  opts: { codeField?: string; nameField?: string; take?: number } = {},
): Promise<LookupCandidate[]> {
  const q = query.trim()
  const take = opts.take ?? 3
  if (!q) return []
  const codeField = opts.codeField ?? 'code'
  const nameField = opts.nameField ?? 'name'
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  const rows: any[] = await model.findMany({
    where: {
      OR: tokens.flatMap((t) => [
        { [codeField]: { contains: t } },
        { [nameField]: { contains: t } },
      ]),
    },
    orderBy: { [codeField]: 'asc' },
    take: 50,
  })
  return rank(rows, q, codeField, nameField)
    .slice(0, take)
    .map((r) => ({ code: String(r[codeField] ?? ''), name: String(r[nameField] ?? '') }))
}

/** "Did you mean" message for the plan error — the model's self-correction handle. */
export function didYouMean(kind: string, query: string, candidates: LookupCandidate[]): string {
  if (candidates.length === 0) return `${kind} '${query}' not found.`
  const list = candidates.map((c) => (c.name && c.name !== c.code ? `${c.code} (${c.name})` : c.code)).join(', ')
  return `${kind} '${query}' not found. Did you mean: ${list}?`
}
