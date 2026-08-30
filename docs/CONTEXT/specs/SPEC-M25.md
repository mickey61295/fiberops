# SPEC-M25 — Line-Grid Keypad: Pcs Despatch (SPEC-M22 §1 follow-up)

> Third six-task run, task 2. SPEC-M22 deferred "pcs-despatch + any
> line-grid family (needs a one-line-at-a-time big line editor — the line
> keypad; follow-up when a line surface demands it)". The despatch desk is
> that surface: shop-floor despatch operators work standing, scanning
> bundles onto a DC. Frozen before code (2026-08-30).

## 1. Scope

**In:** the keypad overlay learns LINES. `KeypadMode` gains an optional
`lineFields` prop (the big line editor): a stacked one-line-at-a-time form
(required-only, same projection discipline as headers), a big "+ ADD LINE"
button, an added-lines list as big rows (style · colour · size · qty with a
✕ remove), a ≥1-line guard on SAVE ("Add at least one line"), and the
commit payload carries `{ header, lines }` through the SAME
planDocAction/commitDocAction doors (ADR-001; the M15 runCommit audit
covers keypad line commits identically).

**Surface:** pcs despatch `/pieces/despatch?mode=keypad` (the named M22
follow-up). Header required = orderNo + totalPcs (dcNo auto, mode
readonly); line required = styleNo (picker) + qty. `nextEntry` resets
lines too. `KEYPAD_LINES_MAX` = 20 (a one-operator DC is short; the full
DocScreen handles bigger).

**Out (deferred, documented):** other line-grid families (order, PO, GRN —
merchandiser surfaces, not shop-floor; add when demanded) · barcode/bundle
scan capture (no scanner in scope) · line EDIT after add (remove+re-add is
the honest operator loop).

## 2. Design

- `src/lib/erp/keypad.ts` — `keypadLinesFor(config)`: lineFields →
  required-only projection (the header discipline verbatim). `KEYPAD_LINES_MAX`
  constant. `KEYPAD_SURFACES` gains `despatch: { route: '/pieces/despatch',
  title: 'Pcs Despatch' }`.
- `src/components/erp/keypad-mode.tsx` — optional `lineFields: KeypadField[]`
  + `lines: Array<Record<string,string>>` state + a `lineValues` draft.
  The line editor renders under the header fields (same big-target
  renderers); ADD appends the draft to `lines` (resets the draft, keeps
  nothing hidden); the added list shows a summary label per line; ✕ removes.
  SAVE with `lineFields` but zero lines = the guard error. The payload is
  `{ header: values, lines }` — plan AND commit both carry it (DocScreen
  parity; the server re-validates through the zod schema either way).
- `src/app/(erp)/pieces/despatch/page.tsx` — `?mode=keypad` branch +
  "⌨ Keypad mode" toggle (the three M22 pages' pattern).

## 3. Tests (keypad-mode.test.ts additions)

1. `keypadLinesFor(despatchConfig)` = exactly [styleNo picker, qty number]
   — required-only; optional colour/size/rate stay on the full screen.
2. `despatch` present in KEYPAD_SURFACES; its route is a LIVE route.
3. Page source pin: the despatch page carries the keypad branch + toggle
   (readFileSync precedent).
4. Component source pin: KeypadMode carries the ADD-LINE button, the
   ≥1-line guard, and passes `lines` in BOTH plan and commit payloads.
5. Service-level: `commitDocAction('despatch', { header, lines })` with a
   two-line payload commits through the door — the DC row exists, the line
   rows exist, and the payload totals match (the M22 smoke's
   waste-receipt round-trip pattern, now with lines; children-first
   cleanup per PITFALLS #40).

## 4. Acceptance gates

tsc src/ 0 · vitest (982+N) · eval --static PASS · context_check NO DRIFT
(pins: keypad-mode.test.ts already pinned; no new files except the spec —
+SPEC-M25.md) · NEW route_smoke_m25.sh (overlay renders the line editor,
ADD-LINE button, guard error on empty-lines SAVE, toggle link, and the
two-line commitDocAction round-trip) · route_smoke_m22 regression · LIVE
browser-verified: keypad despatch overlay, add a line, remove it, SAVE
without lines shows the guard, zero console errors.

## 5. Implementation record (filled at ship time)

- keypad.ts: keypadLinesFor + KEYPAD_LINES_MAX=20 + despatch surface entry.
- keypad-mode.tsx: lineFields prop; line draft state resets on ADD; the
  added-line label = styleNo · colourName? · sizeName? · qty (rate omitted
  — operator summary, full data on the review card); ✕ removes; guard
  fires on SAVE; both doors carry `{ header, lines }`.
- Page wired; toggle beside the breadcrumb (the M22 pages' spot).
- Tests +5 (projection, surface, page pin, component pin, two-line commit
  round-trip incl. children-first cleanup) → 987 vitest.
- Gates: tsc src 0 · 987 vitest · eval --static PASS · context_check
  548→549/549 NO DRIFT (+SPEC-M25.md) · route_smoke_m25 NEW 13/13 ·
  m22 regression 19/19 · LIVE browser-verified (add/remove line, guard,
  zero console errors), screenshot download/m25-despatch-keypad.png.
