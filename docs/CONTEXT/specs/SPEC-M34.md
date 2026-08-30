# SPEC-M34 — Terms Master Feeding Invoice Print (gap-audit A3 frmTerms)

> Fourth six-task run, task 5. Gap-audit §A3: `frmTerms` — "Terms &
> conditions master (print blocks)" → **MAP — AppOption-backed terms
> master feeding print**. The invoice print has hardcoded exactly one
> terms line since M8 ('Goods once sold will not be taken back. Subject
> to Tirupur jurisdiction.'); frmTerms makes the terms block an owned,
> editable master. Frozen before code (2026-08-30).

## 1. Scope

**In:**
- NEW `printTerms(family)` in `src/lib/erp/print/fetchers.ts` (the
  getCompanyName neighbor): reads AppOption key `print.terms.<family>`,
  splits the value on newlines, trims, drops empties → `string[]`.
  NO caching (the admin edits terms and reprints — a stale cache is a
  lie; one findUnique per print is nothing).
- Invoice print wiring (`fetchInvoicePrint`): when
  `printTerms('invoice')` returns lines they REPLACE the hardcoded
  fallback line in `notes` (each line renders as a numbered note);
  absent/empty option → the fallback line stays (the honest default —
  a fresh install is never term-less).
- `/admin/options` help text mentions `print.terms.invoice` beside the
  existing print.* keys (discoverability — the surface already manages
  the rows: MasterTable over AppOption grouped by `group`).
- Agent doors: ZERO new tools — `create_app_option` / `update_app_option`
  / `list_app_options` already exist (G5 satisfied); the SYSTEM_PROMPT
  gains no line (options are already covered by the masters map).
- Tests: helper semantics (absent → [], single, multi-line, blank lines
  dropped); invoice fetcher WITH the option (terms lines render, the
  fallback does NOT) and WITHOUT (fallback present); the agent-door
  round-trip (`update_app_option` flips the block — the master is truly
  chat-editable); options-page source pin.

**Out (deferred, documented):** terms on other print families (po, dc,
debit-note — each is a one-line `printTerms('<family>')` adoption when
wanted) · per-buyer terms (legacy frmTerms was global) · rich formatting
(bold/numbering — PrintSheet numbers notes already) · terms on
PROFORMA/commercial-invoice variants.

## 2. Design

- Key convention follows the existing `print.companyName` /
  `print.gstin` dotted style: `print.terms.invoice`, group `print`,
  label 'Invoice Terms & Conditions'.
- Multi-line = newlines in the value (the MasterTable textarea edits
  them naturally); each non-empty line becomes one numbered note row.
- The fallback is a CONSTANT, not deleted — absent option ⇒ fallback
  (deterministic print for a fresh install, and the existing print
  fidelity tests keep passing).

## 3. Tests

1. printTerms: absent key → []; one line → [line]; three lines with a
   blank between → two lines; whitespace-only value → [].
2. fetchInvoicePrint: with the option set → notes contain all term
   lines and NOT the fallback; after delete → the fallback returns.
3. update_app_option('print.terms.invoice') round-trip — the terms
   block is chat-editable end-to-end.
4. Source pins: the fetcher wiring (printTerms + fallback constant),
   the options-page mention.

## 4. Acceptance gates

tsc src/ 0 · vitest (1091+N) · eval --static PASS · context_check NO
DRIFT (+terms test pin) · zero tools/menu/routes/schema change
(229/132/165/78 stay) · NEW route_smoke_m34 (option set → invoice
print shows the terms block; option cleared → fallback; zero residue)
· LIVE browser-verified (screenshot m34-invoice-terms.png).

## 5. Implementation record (filled at ship time)

- printTerms as specced (no cache, newline split, blanks dropped,
  honest [] on error/absent); DEFAULT_TERMS_FALLBACK constant kept as
  the fresh-install default; invoice fetcher swaps
  `terms.length > 0 ? terms : [DEFAULT_TERMS_FALLBACK]`.
- /admin/options help text carries `print.terms.invoice` + the frmTerms
  lineage (the surface already manages the rows — zero new UI).
- AGENT-DOOR LESSON: update_app_option is plan-then-commit (the write
  lands at commit()); and the master-service treats an EMPTY value as
  "field not provided" — so clearing terms to fallback happens by
  DELETING the option row (/admin/options), not by setting it empty.
  Both documented in the test; no tool change (G5 already satisfied).
- Tests: print-terms.test NEW 11 (helper ×5; invoice print WITHOUT
  fallback / WITH owned lines; agent-door plan→commit→flip round-trip;
  source pins ×3) → **1102 vitest** (1091+11).
- Gates: tsc src/ 0 · 1102 vitest · eval --static PASS 15/15 ·
  context_check 570→**572/572** NO DRIFT (+print-terms.test.ts
  +SPEC-M34.md pins) · zero tools/menu/routes/schema change
  (229/132/165/78 stay) · NEW route_smoke_m34 **12/12** · LIVE
  browser-verified (login → invoice print: all three owned terms lines
  render, fallback correctly absent; screenshot m34-invoice-terms.png
  FULL-PAGE, VLM-confirmed the numbered terms block).
- LIVE-check lesson: zombie chrome daemons from debug runs break the
  flow (about:blank + ERR_CONNECTION_REFUSED) — kill all
  agent-browser/chrome processes before a LIVE script; and the login
  wait must require a REAL localhost URL (about:blank ≠ success);
  screenshots need --full to prove below-the-fold blocks.
