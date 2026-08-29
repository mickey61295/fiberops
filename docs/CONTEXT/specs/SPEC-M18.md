# SPEC-M18 — Print & Command Fidelity (P1)

Date: 2026-08-29 · Status: Frozen before code · Predecessor: M17 (Operator Reflex
Pack) · Evidence: `docs/GAP-ANALYSIS-FIBERPRO.md` §3 (print gaps), §6.2 (collisions
#3/#8), §7.1 playbook lanes R/E/G/P — the audit's P1 lane ("the print-and-keyboard
contract that legacy users consider table stakes").

## 1. Problem

The audit verified: `order` — the document a Tirupur merchandiser handles most —
prints NOTHING (not in PRINT_DOCS, no door on the Order Hub); the TAX INVOICE body
is a single summary row (no HSN column, no bank/remit block, no phone/CIN in the
masthead); one A4 template exists where the plan promised three (A4-GST / Large /
Cost-bearing); there is no 3-copy burst and no print-on-save; ⌘K opens the agent
instead of a command palette (legacy hands expect a global jump bar); pasting an
Excel column block into the line grid does nothing.

## 2. Scope — Wave A (print fidelity, this session)

- **A1. `order` print family.** NEW `fetchOrderPrint` (registry key `order`):
  resolves by id OR orderNo; include buyer + style + lines(style.hsn, colour, size).
  Title `SALES ORDER`; party = Buyer block (Buyer has no address/gstin — render
  name/code/dept/merchandiser only, graceful); meta = Order Date / Delivery Date /
  Status / Currency; lines = S.No, Style, Colour, Size, HSN, Qty, Rate, Amount;
  FCY-aware (currency ≠ INR → symbol map USD/EUR + `@ fxRate` note, no ₹
  mislabel); totals = Sub Total + Total in order currency; amountWords only for
  INR (words in rupees). Door: DocPrintLink on the Order Hub header.
  `PRINT_DOC_BY_DOCTYPE` gains `order: 'order'` (21st) + test pin 20→21.
- **A2. Invoice body completion.** (a) HSN column: when the invoice has an order
  with lines, the lines table becomes per-order-line rows (Description = style +
  colour/size, HSN from `style.hsn`, Qty, Rate, Amount) + an HSN summary block in
  notes (HSN | Qty | Taxable proportioned by qty | GST rate) marked "derived from
  order lines"; without an order the current summary row stays. (b) Bank/remit
  block: `getPrintHeader()` extended with optional `phone / email / cin /
  bankName / bankBranch / bankAcNo / bankIfsc / upi` (AppOption `print.*` keys —
  degrade to hidden when absent); PrintSheet renders the bank strip under the
  totals for MONEY docs only (invoice, debit-note, payment); phone/email/CIN join
  the masthead for every doc. Report print headers unchanged (same optional
  fields, only rendered when present).
- **A3. Templates.** `?template=large` on the print route → the same PrintSheet
  with a +~30% type scale (counter/godown visibility; class-map swap, no second
  engine). Cost-bearing DC: `fetchDcPrint` auto-selects — `totalValue > 0` →
  value columns + amountWords + `COST BEARING` banner; `0` → plain challan (no
  values, no words — the statutory non-cost-bearing form).
- **A4. 3-copy burst.** `?copies=3` on the print route renders the sheet ×
  Original/Duplicate/Triplicate with `break-after-page`; PrintAuto fires ONE
  window.print() (3 pages, one dialog). DocPrintButton gains "All 3 copies".
- **A5. Print-on-save (client pref).** Done card gains an "Auto-print after
  save" checkbox persisted at `localStorage.fo.printOnSave`; when on, a
  successful commit auto-`window.open(printHref)` (the M17 F9 target). Default
  off. Server untouched.

## 3. Scope — Wave B (command & paste, this session)

- **B1. Command palette on ⌘K.** NEW client `src/components/erp/command-palette.tsx`
  (cmdk via the existing `ui/command.tsx`): searchable list of LIVE menu items
  (label + group hint + phase), filtered by the SAME `allowedGroupIds` the layout
  derives (rights-parity with the sidebar), plus an "Open agent panel" entry.
  Enter navigates (`router.push`), Esc closes. Mounted once in AppShell.
- **B2. Agent rebind ⌘K → ⌘J.** agent-panel-provider listens for `meta/ctrl+j`;
  the 10 synthetic `new KeyboardEvent({key:'k', metaKey:true})` dispatchers and
  the topbar/dashboard ⌘K copy switch to ⌘J. Rationale: audit collision #3 —
  ⌘K must be the jump bar; the agent keeps a first-class chord + button.
- **B3. Paste-into-grid.** DocScreen line-grid inputs share an `onPaste`: when
  the clipboard parses to ≥2 cells (TSV preferred, CSV fallback), preventDefault
  and fill the grid from the focused cell — rows grow as needed; number cells
  take the numeric token; select cells match by value OR label; picker cells are
  skipped (column preserved) and reported once in the paste toast. Single-cell
  pastes keep native behavior.

## 4. Scope — Wave C (doc lifecycle + rate memory — spec'd, next session)

- **C1.** doc-view Cancel/Void via the existing update posting services (status
  transitions only, ADR-001-safe server actions); **C2.** doc-view Duplicate
  (New screen prefilled from the viewed doc, client-only); **C3.** rate memory
  (read-only `last_rate` door: latest PO/GRN line rate for party+item; auto-fill
  when the rate cell is blank, toast cites source doc + date); **C4.** self-service
  change password (`/api/auth/change-password`: verify old → set new; the admin
  set-password door stays admin-only).

## 5. Non-goals

No schema changes; no new menu items; no e-invoice/e-way; no Tally export; no
variant-family print templates (local-invoice, courier-dc, … stay unmapped until
the register/masters lane); no Tamil voice/keypad (M19+ candidates); report
landscape printing untouched; sidebar/registry counts (115/147) untouched.

## 6. Acceptance

- vitest: print-doc-map pins 20→21 (order joins, bijection with PRINT_DOCS);
  NEW order-print fetcher test (fixture order → title/party/HSN column/FCY
  symbol/words-for-INR-only); invoice HSN test (with-order lines + summary;
  without-order fallback row); dc template test (value>0 → cost-bearing, =0 →
  plain). All existing suites stay green.
- tsc src/ 0 errors · eval_routing --static PASS · context_check pins bumped
  (PRINT_DOCS 21, new files pinned) → NO DRIFT.
- Authenticated curl smokes: `/print/order/<seeded orderNo>` 200 with
  `SALES ORDER` + HSN cell; `/print/invoice/<invoiceNo>` 200 with bank strip when
  AppOption rows seeded (and absent strip when not); `?template=large` renders
  larger base font (grep class); `?copies=3` renders 3 `break-after-page` sheets;
  Order Hub carries the Print door.
- Manual/browser: palette opens on ⌘K, filters by rights, Enter navigates; ⌘J
  opens the agent everywhere incl. the old synthetic doors; TSV paste into a PO
  grid fills rows; print-on-save toggle persists across reloads.

## 7. Files touched (Wave A+B)

NEW: `src/lib/erp/print/fetchers-order.ts` (order family), 
`src/components/erp/command-palette.tsx` · tests: `tests/unit/order-print.test.ts`,
`tests/unit/invoice-hsn.test.ts` (or folded into one print-fidelity file),
palette/paste covered by existing archetype suites + smokes.
EDIT: `print/index.ts` (+order), `print/doc-type-map.ts` (+order),
`print/fetchers.ts` (invoice HSN + bank; dc template), `reports/report-csv.ts`
(getPrintHeader optional fields), `print-sheet.tsx` (masthead extras, bank strip,
template scale, copies), `print/[docType]/[id]/page.tsx` (?template, ?copies),
`doc-print-button.tsx` (burst item), `doc-screen.tsx` (paste, print-on-save),
`app-shell.tsx` (palette mount), `agent-panel-provider.tsx` (⌘J),
`topbar.tsx` + 10 view files (⌘K→⌘J copy/dispatch), Order Hub page (print door).

## 8. Implementation record

**Waves A+B shipped 2026-08-29 (tag `m18-print-cmd`)** — all gates green:

- A1: `fetchers-order.ts` (id-OR-orderNo; FCY symbol map; words INR-only; buyer
  block dept/merchandiser); PRINT_DOCS 21 (`order` first entry); doc-type-map
  `order→order`; DocPrintLink on the Order Hub header.
- A2: invoice include grew `order.lines{style,colour,size}` — with-order body =
  per-line rows + HSN column + derived HSN-summary note (qty-proportioned
  taxable, gstRate); orderless fallback row intact. `getPrintHeader` +9 optional
  keys (phone/email/cin/bank*/upi); PrintSheet masthead GSTIN·Ph·email + CIN;
  bank strip gated to MONEY_DOCS {invoice, debit-note, payment}.
- A3: `?template=large` (class-map scale; one engine); dc cost-bearing
  auto-template (value>0 ↔ =0 — title, rate/value columns, words, notes).
- A4: `?copies=3` burst — 3 PrintSheets, `print:break-after-page` ×2, ONE
  PrintAuto at route top (per-sheet PrintAuto disabled via `autoPrint={false}`
  prop); DocPrintButton "All 3 copies (burst)" reloads with the param.
- A5: done-card "Auto-print after save" checkbox → localStorage `fo.printOnSave`
  → effect auto-opens printHref once (burstOpened ref).
- B1: `command-palette.tsx` (cmdk CommandDialog; ⌘K toggle; LIVE items filtered
  by allowedGroupIds — sidebar parity; agent + Home entries) mounted in AppShell.
- B2: provider + 10 synthetic dispatchers + topbar/dashboard/tracker copy → ⌘J.
- B3: `handleCellPaste` on grid text/number Inputs (TSV block parse, anchor
  fill, row growth, picker columns consumed-but-preserved, select value/label
  match, ₹/,/$-stripped numbers, summary toast).

Gates: vitest **735/735** (print-fidelity 7 NEW; pins 20→21 in print-doc-map /
print-docs / print-docs-b; dc title pin → COST BEARING) · tsc src/ 0 ·
eval_routing --static PASS · context_check **426/426** (views 31, print lib 7,
families 21, doors 20; +4 file pins) · **route_smoke_m18.sh 15/15** (incl. bank
strip seed→present / remove→absent round-trip) · route_smoke_m9 regression
38/38.

Pitfalls logged (03-PITFALLS #38): tsx `-e` eval mode rejects top-level await
(cjs) — async IIFE required, and `>/dev/null 2>&1` on the seed step turned a
never-ran script into a false "bank strip missing" bug; also getPrintHeader
returns null unless `print.companyName` exists (SPEC-M6 §5 gate) — the smoke
now seeds it and cleans up.

**Wave C remains spec'd-only** (§4): doc-view Cancel/Void/Duplicate, rate
memory (`last_rate` read door), self-service change password.
