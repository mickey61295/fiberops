# SPEC-M33 — Barcode Bundle Flow (gap-audit P3 #2, the SPEC-M9 §9 parked item)

> Fourth six-task run, task 4. SPEC-M9 §9 P3 parked "barcode scanning in
> cutting — a candidate spec when tablet rollout is real"; the bundle DATA
> has existed since M3 (CutBundle.barcode, `*CUT0001B001*` — the verbatim
> contract) with zero VISUAL artifact. Frozen before code (2026-08-30).

## 1. Scope

**In:**
- NEW `src/lib/erp/print/barcode.ts` — the vendored Code128 encoder (the
  M27 QR precedent: zero production dependencies, algorithm attribution):
  - Code sets B + C with python-barcode-compatible switching: digit runs of
    ≥4 ahead switch to C (value 99), a lone buffered odd digit flushes
    through TO_B (100); digit-LEADING text starts in C directly; the
    leading `START_C + TO_B` pair collapses to START_B (104) — the exact
    `_maybe_switch_charset`/`_try_to_optimize` semantics, ported.
  - Checksum: `(startValue + Σ valueᵢ·i) mod 103`, i from 1 — the standard.
  - `code128Symbols(text)` → value[] · `code128Modules(text)` → the full
    module stream (START + data + checksum + STOP + `11` termination bar).
  - `code128Svg(text, {height, moduleWidth, showText})` — inline SVG (one
    `<path>` of dark modules, 10-module quiet zones in the viewBox,
    crispEdges — prints identically everywhere) + human-readable text
    under the bars (the operator reads what the gun can't).
  - Input validation: every char must live in Code B (ASCII 32–126,
    value = charCode − 32); anything else throws — honest fail-safe.
- VERIFICATION (the jsQR discipline, 1D edition): the module stream must
  be BYTE-IDENTICAL to `tests/fixtures/code128-reference.json`
  `encodings` — python-barcode 0.16.1's OWN `Code128.build()` output for
  14 samples (the 6 originals + 8 covering the C-start paths: digit
  leading `1234`/`001`/`12`/`99`, mixed `1042AB`, odd trailing
  `SO-1041`, minimal `X`, `CUT-0009/B12`). The fixture generator
  (`scripts/gen_code128_fixture.py`, MIT lib) stays the ground-truth
  source.
- Bundle label PRINT (the physical sticker the cutter scans):
  - NEW print docTypes `bundle-labels` (input: cutOrder id or CUT-#### —
    ONE sheet, one label card per bundle) and `bundle-label` (input:
    bundleNo / barcode / db id — the single torn-label reprint).
  - `PrintDoc` gains `labels?: { heading, meta: PrintMetaRow[], barcode,
    barcodeText }[]`; PrintSheet renders a 2-column label-card grid when
    present (additive — absent = today's sheet, byte-identical).
  - Card content: bundleNo heading + order/style/colour/size/qty meta +
    the Code128 SVG of `CutBundle.barcode` + human-readable text.
  - Cut Order VIEW gains a "Print bundle labels" DocPrintLink beside the
    sheet print; DocPrintLink gains an optional `label` prop.
- Agent tool `get_bundle` (G5 — the scan reflex is chat-reachable):
  resolve by bundleNo OR barcode → bundle + order + status + qty + a
  /print/bundle-label deep link. Tools 228 → 229.

**Out (deferred, documented):** hardware scanner integration (scan guns
type — the `?bundle=` URL already resolves, M5) · Code set A (control
chars never occur in bundle barcodes) · QR-on-label (bundle identity is
1D by contract) · label stock sizes / per-label page breaks (CSS
grid-flow prints fine on A4; dedicated sticker stock is a deployment
decision) · GS1-128 FNC1 application identifiers.

## 2. Design

- The encoder replicates python-barcode's state machine LITERALLY
  (charset C initial, buffer, switches, final optimize collapse) so the
  fixture parity is byte-for-byte — not "equivalent but different".
- Code B value = charCode − 32 (ASCII 32–126) — no table needed; the
  fixture's `valueB` map verifies the identity in tests.
- The label sheet is a PRINT surface only (no new menu/route beyond the
  registry-driven /print route; no schema change — CutBundle.barcode is
  the contract, untouched).
- SVG mirrors qrSvg's shape discipline: single `<path>`, viewBox with
  quiet zones, shape-rendering crispEdges, no external refs.

## 3. Tests

1. Fixture parity: `code128Modules(t) === encodings[t]` for ALL 14
   samples (incl. every C-start path and odd-digit flush).
2. valueB identity: `charCode − 32` equals the fixture map for every
   Code-B char (0-105 pattern table spot-checked against `patterns`).
3. Symbol decode round-trip: decode(code128Modules(t)) reconstructs the
   text (independent of parity — catches table typos).
4. SVG shape: `<svg` + crispEdges + quiet-zone viewBox + human text
   + bar-count sanity; non-Code-B input throws.
5. Fetcher: bundle-labels builds one card per bundle (barcode SVG +
   rows, ordered by bundleNo); bundle-label resolves by bundleNo AND by
   barcode; unknown → null.
6. PrintSheet renders the labels grid when `labels` present (source
   pin); cut-order view carries the print-labels link (source pin);
   PRINT_DOCS registry pins ×2; get_bundle tool registered + resolves.

## 4. Acceptance gates

tsc src/ 0 · vitest (1072+N) · eval --static PASS · context_check NO
DRIFT (+barcode.ts +print-barcode.test.ts +SPEC-M33.md pins; print lib
8→9; tools 228→229) · NEW route_smoke_m33.sh (labels sheet for a real
cut order: N cards + N barcode SVGs + human text; single-label reprint
by barcode; unknown → 404; zero residue) · LIVE browser-verified (cut
order view → Print bundle labels → the sheet; screenshot
m33-bundle-labels.png).

## 5. Implementation record (filled at ship time)

- Fixture STRENGTHENED before code: +8 samples covering the C-start paths
  (`1234`/`001`/`12`/`99` digit-leading, `1042AB` mixed, `SO-1041` odd
  trailing, `X` minimal, `CUT-0009/B12`) → 14 ground-truth encodings.
- barcode.ts as specced, with TWO gate catches in its first hour (the M27
  pattern repeating):
  1. The hand-typed CODES table had **46 drift errors** — caught by the
     parity check, fixed by GENERATING the table from the fixture (the
     "NEVER hand-typed" pin documents the lesson).
  2. python-barcode's `_try_to_optimize` ALSO collapses START_C + value 99
     (the '99' digit pair is indistinguishable from TO_C) — the '99'
     fixture sample failed 13/14 until the second collapse rule was
     ported. Final parity: **14/14 byte-identical**.
- The narrowing-proof charset read (closure defeats TS flow analysis) —
  the state machine mutates mid-block, tsc's narrowing lies there.
- Bundle label surfaces as specced: `bundle-labels` (cut order → one card
  per bundle, ordered) + `bundle-label` (reprint by bundleNo / barcode /
  id — with safeDecode handling the %2F path-param form); PrintSheet
  renders the 2-col card grid (data-testid=label-cards +
  label-barcode-N); DocPrintLink +label prop; cut-order view carries the
  "Print bundle labels" door.
- The print-doc-map "no orphan fetchers" invariant AMENDED honestly: the
  two label docTypes are reached via the cut-order view link + the
  get_bundle agent tool (NON_CONFIG_DOORS allowlist, documented) — labels
  are OF a cut order, not a doc family of their own. Registry pins
  21 → 23.
- get_bundle tool (228 → 229; pins ×9 files + context_check; SYSTEM_PROMPT
  cutting line carries it). Resolves by bundleNo/barcode/id + the
  labelPrint deep link; honest miss message.
- Fixture SURGERY (pre-existing drift found at the gates): the
  parallel-session db commit (a390a30) had silently degraded the LPP PO
  regression fixture — the 5 orders survived with exact pcs/values but
  lost the 696GJ style link (→ STY-0001) and the USD flag (→ INR), so
  eval --static fell to 13/15. NEW scripts/repair_lpp_fixture.ts
  (idempotent) restores the documented state — 15/15 PASS again.
- Tests: print-barcode.test NEW 19 (parity ×2 incl. the contract format
  round-trip through a test-local DECODER; valueB identity for all
  printable ASCII; C-start + '99'-collapse symbol pins; SVG shape ×4;
  fetchers ×4 service-level; registry + tool pins; source pins ×4) →
  **1091 vitest** (1072+19).
- Gates: tsc src/ 0 · 1091 vitest · eval --static PASS 15/15 (after the
  fixture repair) · context_check 565→**570/570** NO DRIFT (+barcode.ts
  +print-barcode.test.ts +code128-reference.json +gen_code128_fixture.py
  +SPEC-M33.md pins; print lib 8→9; tools 229; print families 23) · NEW
  route_smoke_m33 **17/17** · LIVE browser-verified (login → cut order
  view → Print bundle labels → 3 cards + 3 Code128 SVGs + barcode text
  read back; screenshot m33-bundle-labels.png, VLM-confirmed: bars +
  meta rows + heading all render).
