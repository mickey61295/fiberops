# SPEC-M22 — Keypad-Operator Mode (gap-audit §7-K, P3 lane)

> Second six-task run, task 5. "Shop-floor entries (production tally, pcs
> despatch, bundle scan) want a stripped full-screen keypad UI with big
> targets — one operator, one action, zero chrome. A `mode=keypad` skin over
> existing DocScreens." Frozen before code (2026-08-30).

## 1. Scope

**In:** a generic keypad surface over the DocScreen FORM DOOR —
`?mode=keypad` on a DocScreen page swaps DocScreen+breadcrumb+recent for a
full-screen overlay (fixed inset-0 — covers the shell chrome, zero CSS
hacks) rendering ONLY the config's REQUIRED header fields as big touch
targets (h-14 inputs, h-16 commit). The two-step save survives in keypad
form: big SAVE → the plan review card (summary + creates, large text) →
CONFIRM → commit → success screen (docNo, big text) with "Next entry" +
"Exit". Both steps call the SAME planDocAction/commitDocAction server
actions DocScreen uses (ADR-001; the M15 runCommit audit door covers keypad
commits identically — actor=the session user, source=form).

**First surfaces (header-only families):** production entry (production
tally — /production/entry), cut order (/cutting/job-order), waste receipt
(/inventory/waste-receipt). The pages carry a "⌨ Keypad" toggle link; the
URL is QR-able (a tablet at a line scans straight in).

**Out (deferred, documented):** pcs-despatch + any line-grid family (needs a
one-line-at-a-time big line editor — the line keypad; follow-up when a line
surface demands it) · barcode/bundle-scan hardware capture (no scanner in
dev scope) · menu item (operators arrive by URL/QR from a tablet; the toggle
link is the in-app door) · offline queue.

## 2. Design

- `src/lib/erp/keypad.ts` — `keypadFieldsFor(config)` PURE projection:
  headerFields → required-only, dropping `readonly` fields and the
  `numberField` (auto docNo); carries picker/pickerValueField/options.
  Dates default to today (the M17 reflex convention).
  `KEYPAD_SURFACES`: slug → { route, title } for the three shipped surfaces
  (the wiring contract the tests pin).
- `src/components/erp/keypad-mode.tsx` — client overlay. Field renderers:
  text/number/date → big inputs (numeric gets inputMode='decimal'); select →
  big select; picker → big search input + option buttons fetched from the
  shared `/api/erp?resource=master_search` read path (the DocPicker feed,
  debounced). Plan errors render big-and-red (operator-legible). Commit →
  `commitDocAction(slug, { header, lines: [] })`.
- Page wiring: each of the three pages reads `searchParams.mode`; keypad
  branch renders `<KeypadMode … />` and SKIPS the recent-docs query.

## 3. Tests

`tests/unit/keypad-mode.test.ts` — pure projection (required-only, docNo +
readonly dropped, pickers carried; dates default today), KEYPAD_SURFACES ⊆
LIVE_ROUTES with real doc-config slugs, source pins (the three pages carry
the keypad branch — the M17 readFileSync precedent), and the component's
commit payload shape (header only, lines []). Gates: tsc src/ 0 · vitest ·
eval --static · context_check NO DRIFT · route_smoke_m22 (page renders the
overlay with big-Save marker for all three surfaces; base pages carry the
toggle; a service-level commit proof).

## 4. Implementation record

Shipped 2026-08-30. Files: src/lib/erp/keypad.ts (keypadFieldsFor pure
projection — required-only, readonly + numberField dropped; KEYPAD_SURFACES
×3; keypadDefaultFor — dates default today) ·
src/components/erp/keypad-mode.tsx (full-screen fixed overlay covering ALL
shell chrome; h-14 inputs / h-16 SAVE/CONFIRM; picker fields = big search +
12 option buttons off the shared master_search feed; fill → plan review →
confirm → done phases; planDocAction/commitDocAction — the SAME form door,
M15 audit identical) · keypad branch + ⌨ toggle on /production/entry,
/cutting/job-order, /inventory/waste-receipt (header-only families;
pcs-despatch line-grid deferred, documented). Tests: keypad-mode.test NEW 9
(projection ×5 incl. opening-stock readonly precedent + waste class options
order; wiring contract — real slugs, live routes, page source pins,
header-only assertion, ADR-001 source pin). Gates: tsc src/ 0 · 958 vitest
· eval --static PASS · context_check 535→540/540 NO DRIFT (views 34→35 +
file pins) · route_smoke_m22 19/19 (three overlays + required-only proof +
auto-number exclusion + toggles + the commitDocAction round-trip with a
keypad-shaped header-only payload). Smoke lesson: RSC payload strings
(preloadStyle) fake text greps — pin rendered labels with >Label</label>.
