/* SPEC-M61 §7.2 (E-3.2) — natural-key duplicate detection, two bands.
 *
 * Band A: normalized-exact (trim, case, whitespace, punctuation, legal
 *         suffixes) → the amber C-2.1 warning + "Create duplicate anyway".
 * Band B: fuzzy (trigram similarity ≥ 0.85 OR Jaro-Winkler ≥ 0.90) → the
 *         softer "There's a similar <entity> 'X' (CODE) — same one?" note.
 *
 * Research basis (§7.2): record-linkage practice is clear that false
 * positives are the damaging error for AUTOMATIC actions, but advisory
 * warnings tolerate recall — two bands keep the amber warning credible.
 * Person-name phonetics (indicfuzz-class) are explicitly OUT of scope for
 * brand-name masters (deferred, named in §8).
 *
 * Pure functions only — no db, no clock: unit-testable in isolation.
 */

/** Legal-form suffixes stripped by Band A normalization (order matters:
 * longer phrases first). Industry words (Textiles/Knitwear/Garments) are
 * deliberately NOT stripped — "LPP Textiles" and "LPP Garments" are
 * different companies, not duplicates. */
const LEGAL_SUFFIXES: string[] = [
  'private limited', 'pvt limited', 'pvt ltd', 'private ltd',
  'incorporated', 'corporation', 'limited', 'ltd', 'llp', 'l p', 'lp',
  'inc', 'llc', 'plc', 'pte', 'sdn bhd', 'gmbh', 'ag', 'bv', 'oy', 'ab',
  's a', 'sa', 'a s', 'and company', 'and co', 'co', 'company', 'corp',
  'pvt', 'sons', 'brothers',
]

/**
 * Band A normalization: lowercase → '&' → 'and' → strip punctuation →
 * collapse whitespace → drop trailing legal suffixes.
 * Dots and apostrophes are decorative joins (L.P.P. → lpp, Mother's → mothers);
 * other punctuation (hyphens, parens, slashes) separates words.
 * '  L.P.P. S.A. ' → 'lpp'; 'Tirupur Knitwear (Pvt) Ltd' → 'tirupur knitwear'.
 */
export function normalizeName(raw: string): string {
  let s = String(raw ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'’']/g, '') // decorative joins — no word boundary
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // drop trailing legal suffixes (possibly several: "… pvt ltd" → "…")
  let changed = true
  while (changed) {
    changed = false
    for (const suf of LEGAL_SUFFIXES) {
      if (s.endsWith(' ' + suf) || s === suf) {
        s = s === suf ? '' : s.slice(0, -(suf.length + 1))
        changed = true
        break
      }
    }
  }
  return s.trim()
}

/** Character trigrams of a padded string ('  abc ' → ['  a',' ab','abc','bc ','c  ']). */
function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `
  const out = new Set<string>()
  for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3))
  return out
}

/** Trigram similarity (Dice coefficient): 2·|A∩B| / (|A|+|B|). 1.0 = identical. */
export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(a)
  const B = trigrams(b)
  if (A.size === 0 && B.size === 0) return 1
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  return (2 * inter) / (A.size + B.size)
}

/** Jaro-Winkler similarity (prefix-weighted). 1.0 = identical. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1
  const la = a.length
  const lb = b.length
  if (la === 0 || lb === 0) return 0
  const window = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1)
  const aMatch = new Array<boolean>(la).fill(false)
  const bMatch = new Array<boolean>(lb).fill(false)
  let matches = 0
  for (let i = 0; i < la; i++) {
    const lo = Math.max(0, i - window)
    const hi = Math.min(lb - 1, i + window)
    for (let j = lo; j <= hi; j++) {
      if (!bMatch[j] && a[i] === b[j]) {
        aMatch[i] = true
        bMatch[j] = true
        matches++
        break
      }
    }
  }
  if (matches === 0) return 0
  // transpositions
  let k = 0
  let transpositions = 0
  for (let i = 0; i < la; i++) {
    if (!aMatch[i]) continue
    while (!bMatch[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  transpositions /= 2
  const jaro = (matches / la + matches / lb + (matches - transpositions) / matches) / 3
  // Winkler prefix bonus (max 4 chars, scale 0.1)
  let prefix = 0
  const maxPrefix = Math.min(4, la, lb)
  while (prefix < maxPrefix && a[prefix] === b[prefix]) prefix++
  return jaro + prefix * 0.1 * (1 - jaro)
}

export const TRIGRAM_THRESHOLD = 0.85
export const JARO_WINKLER_THRESHOLD = 0.9

/** Band B test: trigram ≥ 0.85 OR Jaro-Winkler ≥ 0.90 (§7.2). */
export function isFuzzyDuplicate(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  return (
    trigramSimilarity(na, nb) >= TRIGRAM_THRESHOLD ||
    jaroWinkler(na, nb) >= JARO_WINKLER_THRESHOLD
  )
}
