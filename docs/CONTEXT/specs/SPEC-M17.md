# SPEC-M17 — Operator Reflex Pack (P0)

Date: 2026-08-29 · Status: Frozen before code · Predecessor: M12 (E2E) ·
Evidence: `docs/GAP-ANALYSIS-FIBERPRO.md` §6.2 (user-directed queue jump over the
SPEC-M9 §9 P2 queue — M13 digest / M14 perf / M15 audit / M16 dashboards stay reserved).

## 1. Problem

The gap audit verified 10 day-1 reflex collisions for a 15-year Fiberpro operator.
The top ones are pure-frontend, zero-schema fixes. This milestone ships the 8 cheapest
("P0"). One sentence: **make Enter, F-keys, dates, rows and print behave the way
legacy hands expect.**

## 2. Scope (8 items) — all frontend, no schema, no service changes

- **A. Enter contract (doc-screen.tsx).** Today Enter inside the line grid implicit-
  submits the whole `<form>` into "Save & review plan" (`<form onSubmit>` wraps the
  editor). New contract (legacy parity):
  - Enter on `input`/`select` inside the LINE GRID → advance to next cell in the row;
    at the LAST cell → append a new row and focus its first cell (Enter = "commit row,
    spawn next").
  - Enter on `input`/`select` inside the HEADER card → advance to the next header
    field; at the last → focus the first line-grid cell (or the save button when the
    family has no line editor).
  - Enter is NEVER an implicit form submit anywhere in the editor. Save = button,
    Ctrl+S, or F2. `textarea` Enter keeps inserting newlines (excluded). Enter on
    buttons (picker triggers) keeps the native click (excluded).
  - Implementation: one container `onKeyDown` (already exists for Ctrl+S) extended;
    DOM-walk `closest('tr')` for the grid case; focus-new-row via a pending-focus ref
    resolved in `useEffect`.
- **B. F-key map (doc-screen.tsx).** F2 = save (edit phase, same as Ctrl+S);
  F9 = print (done phase: `window.open` the print URL — lands on the auto-print
  route); Escape = back to edit (review phase). All `preventDefault`-ed.
- **C. Date defaults to today (doc-screen.tsx).** In `new` mode, header fields of
  `type: 'date'` initialize to the LOCAL today (`en-CA` ISO string) unless a prefill
  supplies a value; `resetForAnother()` re-applies the same defaults. View mode and
  non-date fields untouched.
- **D. Print on the post-commit card (doc-screen.tsx).** The `done` card gains a
  "Print" link (and F9) when the family is printable: `/print/{printDocType}/{id}?copy=original`.
  Mapping lives in a NEW neutral module `src/lib/erp/print/doc-type-map.ts`
  (`PRINT_DOC_BY_DOCTYPE`: the 20 doc-config docTypes that view pages already print —
  e.g. `purchase-order→po`, `cut→cut-order`, `despatch→pcs-despatch`, `jobwork-out→dc`,
  `production→production-entry`). Neutral module because `print/index.ts` imports the
  db (server-only) and DocScreen is a client component. Variant families
  (local-invoice, multi-process-grn, courier-dc, …) are NOT mapped yet — that is the
  print-fidelity milestone's job.
- **E. Register rows: full-row click + keyboard nav (register-screen.tsx).**
  `tbody` moves to a NEW client component `src/components/erp/register-rows.tsx`:
  rows with `href` are fully clickable (`router.push`), carry `tabIndex={0}` (roving),
  ArrowUp/ArrowDown move focus between rows, Enter opens. The first-column `Link`
  stays (a11y / middle-click). The rest of RegisterScreen stays a server component.
- **F. Real global `/` (master-table.tsx).** Component-level `useEffect` keydown:
  `/` focuses the search input when the user is not already in a text field; removes
  the decoy (the current `tabIndex={-1}` button remains for mouse users). Esc keeps
  clearing.
- **G. "Despatch" label fix (menu-registry.ts).** Group label `Dispatch & Logistics`
  → `Despatch & Logistics` (label only — routes `/dispatch/*` NEVER change, M1 rule).
  Stale header comment `ITEMS (113)` → `ITEMS (115)`.
- **H. Hide raw tool chips (doc-screen.tsx, register-screen.tsx).** The
  `create_order`-style mono Badges disappear from the doc-screen headers (both modes)
  and the register-screen "Agent door" badge row. The two-door principle stays
  communicated by the "Ask agent" / "Ask about this data" / "Fill with AI" buttons and
  the master-table footer line.

## 3. Non-goals (explicitly deferred)

Command palette / global jump bar; F4 picker open; arrow-key column navigation in the
grid; print-on-save flags + 3-copy burst; `order` print docType; Large/Cost-bearing
templates; rate memory; paste-into-grid; keypad mode; register grouped subtotals.
(These are the M18+ muscle-memory backlog per GAP-ANALYSIS §7/§9.)

## 4. Acceptance

1. `npx tsc --noEmit` clean; `npx vitest run` green (new pins below included).
2. New unit test `tests/unit/print-doc-map.test.ts`: every `PRINT_DOC_BY_DOCTYPE`
   value exists in `PRINT_DOCS`; all 20 PRINT_DOCS keys are reachable; the 20 mapped
   doc-config docTypes exist in DOC_CONFIGS index (config-slug contract).
3. `menu-registry.test.ts` green after label/comment edits (115 items, 17 groups).
4. Manual browser check (dev server): on `/orders/new` — Enter in the last grid cell
   appends a row and focuses it; Enter in header advances; no implicit submit;
   F2 opens review; date field shows today; after commit the done card offers Print;
   F9 opens the print tab. On a register page: row click anywhere opens the doc;
   ↑/↓/Enter work. On a masters page: `/` focuses search.
5. context_check NO DRIFT; worklog + STATE updated in the same commit; tag `m17-reflex`.

## 5. Files touched

`src/components/archetypes/doc-screen.tsx` (A,B,C,D,H) ·
`src/components/archetypes/register-screen.tsx` (E,H — tbody extracted) ·
`src/components/erp/register-rows.tsx` (NEW) ·
`src/components/archetypes/master-table.tsx` (F) ·
`src/lib/erp/menu-registry.ts` (G) ·
`src/lib/erp/print/doc-type-map.ts` (NEW) ·
`tests/unit/print-doc-map.test.ts` (NEW) ·
docs + STATE + worklog.
