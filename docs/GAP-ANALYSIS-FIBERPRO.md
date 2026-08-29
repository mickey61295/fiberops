# FiberPro Parity Deep-Dive — What's Still Missing & The Tirupur Muscle-Memory Playbook

Date: 2026-08-29 · Status: Evidence audit (read-only, no code changed) · Owner: agent + mickey
Method: full re-read of the frozen legacy evidence (`docs/form-taxonomy.json` — 321 forms,
`research/REQUIREMENTS.md` — 16 modules, `PLAN-2.0-MENU-PARITY.md`) cross-checked against the
live codebase (`menu-registry.ts` 147 routes, `master-configs/` ×30, `report-configs/` ×28,
`print/` ×20 doc types, `doc-screen.tsx` + archetypes, `schema.prisma` 65 models). Every claim
below was grep-verified in the repo. The `source-erp/` reverse-engineering tree is GONE from this
sandbox — taxonomy + plan are the surviving evidence; this doc now carries the deltas forward.

---

## 0. The Honest Scoreboard

| Dimension | Legacy Fiberpro | FiberOps today | Verdict |
|---|---|---|---|
| Forms mapped | 321 forms / 307 unique units | 235 forms claimed by 115 menu items, all routes live | **86 forms unmapped (27%)** |
| Masters | 52 master forms (~40 entities) | 30 master configs, 21 create tools | **~22 entities missing (incl. Bank, Mill, Machine, State, Shade)** |
| Reports | 491 files ≈ 80 unique outputs | 28 report slugs + 6 packs + MIS | **~50 outputs missing, incl. all material-wise stock registers** |
| Print | 18+ variants/doc, print-on-save | 20 doc types, **1 template**, manual print | Order sheet **not printable at all** |
| Registers | 47 register forms | 22 register screens | 21 register forms have no home |
| Keyboard | F-keys, grid Enter, full-keyboard flows | Ctrl+S + ⌘K only | **Reflex collisions (see §6)** |
| Integrations | SMS/mail reminders, weight scale, barcode | none | Feature losses vs legacy |

The parity tracker says **115/115 menu items live** — true, but it measures the *plan's* ~90-item
menu tree, not the *legacy's* 321-form surface. The collapse logic (5 archetypes) was sound; this
audit finds what fell through the collapse.

---

## 1. Gap A — The 86 Unmapped Legacy Forms (categorized, with disposition)

### A1. Registers & report launchers — 21 forms (the biggest real gap)
Legacy operators lived in material-wise day-books. Ours are generic.

| Legacy form | What it was | Disposition |
|---|---|---|
| `FrmYarnStockRegister`, `FrmFabricStockRegister`, `FrmAccStockRegister`, `FrmGeneralStockRegister`, `FrmItemwiseStockRegister` | Material-wise stock registers (yarn/fabric/accessory/general/itemwise) | **MAP** — one register-config each over the existing stock-ledger service with `itemType` filter preset. Cheap: the service already exists (`/inventory/register` is generic). |
| `FrmCutingReg` | Cutting day-book register | **MAP** — register over cut orders + line issues |
| `FrmOrderwisePcsReg` | Order-wise pieces register | **MAP** — pcs-stock grouped by order |
| `FrmOrdBundIssToLineReg` | Order/bundle issue-to-line register | **MAP** — line-issue register view |
| `FrmTradingOrdersInHandReg` | Trading in-hand orders (in-hand item claims `ST_Ord_inHand` instead) | **FOLD** into `/orders/in-hand` with a `type=trading` filter |
| `frmSupordPendReg`, `FrmSupplierOrderRegister`, `FrmSuppOrderHistoryReg` | Supplier/jobwork pending + history registers | **MAP** — jobwork balance + supplier-bills variants |
| `FrmProdShiftWagesReg` | Shift wages register | **MAP** — wages register by shift |
| `FrmProductionEntryReg` | Production entry day-book | **FOLD** into `/production/register` (exists — verify grouping parity) |
| `FrmPLReg` | P&L register | **DECIDE** — needs final-accounts story (§4) |
| `FrmStatusReg`, `FrmExpenseEntryRegister` | Status / expense day-books | **MAP** — register configs |
| `FrmRegister`, `FrmReport`, `frmRpt`, `FrmCrysReport` | Generic report shells | **DROP** — replaced by Report Hub |

### A2. DC / delivery family variants — 10 forms
| Legacy form | What it was | Disposition |
|---|---|---|
| `frmDelCumInv` | Delivery-cum-invoice (single-shot DC + invoice for local trade) | **DECIDE** — Tirupur local suppliers love this one; could be a despatch variant that auto-drafts the local invoice |
| `FrmDcWiseDtl` | DC-wise detail drill | **FOLD** into despatch register drill-down |
| `FrmDcIdUpdation`, `frmGeneralDCCompletion` | DC correction/completion utilities | **MAP** — doc-view edit/complete actions (§5) |
| `frmAccSalesDel`, `frmPrsDel`, `frmPrsDelAcc`, `frmProdCutComponents`, `frmPcsDelRecClose`, `frmBudcom` | Variant DC entry/close forms | **FOLD** as variants of existing despatch/DC configs |

### A3. Misc transactions — ~30 forms (the "misc" family)
Highest-value finds first:
| Legacy form | What it was | Disposition |
|---|---|---|
| `frmDefaultRate` | Default-rate memory per party+item | **MAP** — rate suggestion on PO/GRN/invoice lines (see §7-R) |
| `FrmOrderRelatedInput_Excel` | Excel order input | **MAP** — CSV/paste import into order/PO line grids (see §7-E) |
| `FrmWasteReceiptEntry` | Waste/scrap receipt | **MAP** — stock-adj variant (waste is tracked religiously in knitting units) |
| `FrmDiaChange`, `FrmFinalDiaUpdation`, `frmDiaSize`, `frmGrammage` | Dia/GSM correction utilities | **DECIDE** — master-edit batch tools or agent tools |
| `frmTerms` | Terms & conditions master (print blocks) | **MAP** — AppOption-backed terms master feeding print |
| `FrmStyleDesc`, `frm_composition`, `FrmPartDefineEntry`, `frmProcessOrd`, `FrmSewingReq`, `FrmNonBillable`, `frmGenrec`, `frmPaytem`, `FrmExpenseGroup`, `frmOrderGroup`, `FrmOrderRef`, `FrmPOEntryWithMultipleStyleNo`, `frmPcsStockAdjustmentEntry`, `FrmOtherPORelatedIps`, `frmDomestic_Acc_Issue` | Entry helpers/groupers | **FOLD** as variants/filters of existing doc screens |
| `Frm_FormDef`, `FrmOptionUpdate`, `FrmGeneralClose` | Form-def/option/close utilities | **DROP** (config-engine replaces) |
| `Frm_CommercialTemplate`, `Frm_ProRouteTemplate`, `Frm_WF_DocumentStore` | Template/document store | **DECIDE** — doc-attachment feature or drop |
| `Frm_AppAwBill` | A&W (approval-when?) billing | **DECIDE** with accounts flow |

### A4. Settings & admin — 12 forms
| Legacy form | Disposition |
|---|---|
| `FrmSMSMailSetup` | **MAP-NEW** — reminders/digest channel (§7-D); SMS per se may be replaced by WhatsApp-style digest |
| `FrmOrderDisplayDaysSetting`, `FrmProcessByPassSetting`, `frmProdutionConfig` | **FOLD** into `/admin/settings` flags (registry exists) |
| `FrmChangePassword` | **MAP** — users page lacks self-service password change (only admin reset exists) |
| `Frm_Lock`, `Frm_Password_List`, `FrmLogin_New`, `FrmLoginReg`, `FrmDataDelete`, `FrmDelete`, `frmTblErase` | **DROP** — intentional (security/data-purge non-goals; keep it that way) |

### A5. Production/wages/costing — 7 forms
`Frm_ProductionCost` (production cost rollup — fold into costing input), `FrmProdExpenses`
(expense variant), `Frm_ProdWagesDept`/`_Stage` (wage variants — the registry names them with
phantom strings, see §8), `FrmPrg_GSM_LL_EditEntry` + `FrmProg_Acc` (program GSM/LL correction +
acc program variant — fold as program variants).

### A6. Utilities — 4 forms
`Frm_GoDownSel` (godown picker — our pickers cover it), `frmPopUp`/`frmclose` (absorbed),
`frmPrintDesign` (**DECIDE** — a print-layout tweak UI; recommend deferring, config templates
instead).

---

## 2. Gap B — Masters: 30 of 52 built

`MASTER_FORMS` in menu-registry *claims* all 52 via the masters hub, but only 30 configs + 21
create tools exist. **Claimed-but-unbuildable entities** (verified: no Prisma model):

| Missing entity | Legacy form(s) | Business pain if absent |
|---|---|---|
| **Bank / Bank account** | FrmBankMaster, FrmMasBank, FrmMasBankAccount | Payment modes can't reference banks; invoice remit-to block incomplete |
| **Mill** | FrmMill | Knitting/dyeing mills are first-class parties in job-work towns |
| **Machine / Machine category** | FrmMachineMaster, FrmMachineCategory | Line/machine capacity planning, maintenance |
| **State** | FrmStateMaster | GST place-of-supply, e-way destiny |
| **Shade** | FrmShadeEntry | Shade ≠ Colour in dyeing (colour family × shade depth) |
| **Thread type** | FrmThreadTypeMaster | Sewing-thread consumption costing |
| **Count group** | FrmCountGroup | Yarn count grouping for procurement |
| **Range / Range group** | FrmRange, FrmRangeGrp, FrmRange_Orderwise | Size-range packs for export packing |

Plus ~14 minor ones (Concern, DeliveryAt, WorkNature, Template, BuyerDept, Fcy/FCR currency
masters, FomGrp, DeptGroup, CommRate/PrdnRate/RateMaster, StageWiseTag, PreCostingCompMas) —
**DECIDE**: most fold into AppOption-style config; Fcy (currency) matters if export invoicing
goes multi-currency. Recommendation: one **Masters-Completion milestone** adds the 8 painful ones
as real configs (each ≈30 lines config, zero code), adjudicates the rest in an ADR.

---

## 3. Gap C — Reports & Print fidelity

### C1. Reports: 28 slugs vs ≈80 unique legacy outputs
Present: 28 slugs in 6 packs + MIS (KPI tiles + 14-day bars). Missing families (verified absent):
1. **Material-wise stock registers** (yarn/fabric/acc/general/itemwise) — top operator ask
2. **Closing stock as-of-date** (period-end statement, godown/party-wise) — current ones are live-position only
3. **Cutting register**, order-wise pcs, bundle/issue-to-line day-books
4. **Supplier pending/history** (supord pending is a daily Tirupur phone-call script)
5. **Final accounts**: trial balance, P&L, balance sheet, day-book/cash-book
6. **Program reports** (knitting/lay/roll program sheets)
7. **Attendance/payroll register + salary slip** (only piece-rate wages exist)
8. **Piece-rate & rate-confirmation prints** (registers exist as screens; no confirmation-note print)
9. **Courier manifest, lorry loading slip, bill-pass voucher, process-return DC challan**
10. **Tally export** (open decision #3 — a JSON adapter is cheap)
11. **e-invoice/e-way bill** — not even the v1-promised mock IRN exists (verified: zero code)

### C2. Print: 20 doc types, ONE template
- **`order` is missing from PRINT_DOCS** — the sales-order sheet is the single most-printed
  document in a Tirupur export house (works order for the floor). Highest-value print gap.
- Plan §1.4 promised 3 templates (A4-GST, Large, Cost-bearing). **Only A4 exists.** Large
  (wide-column ledgers/POs) and Cost-bearing (management copy with cost/margin) were never built.
- **Invoice body is thin for Indian trade**: no per-line HSN column, no bank-details/remit-to
  block, no company phone/CIN/logo in masthead. Buyers' finance teams reject such invoices.
- **No print-on-save**: legacy printed by default when a doc was committed; ours requires
  navigating to the view page first. Post-commit card offers View/Next/Another — add **Print**.
- No multi-copy burst (Original+Duplicate+Triplicate in one job — currently 3 clicks).
- Copies/autoprint mechanics themselves are good (copy banners, `?autoprint=0`, amount-in-words
  "Rupees…Only", en-IN ₹, "Subject to Tirupur jurisdiction").

---

## 4. Gap D — Feature-level absences (legacy had, we have not)

| Feature | Legacy evidence | Note |
|---|---|---|
| SMS/mail reminders | `FrmSMSMailSetup` | Daily-reminder culture (DC returns due, approvals pending, balances). Replace with digest (§7-D) |
| Weight-scale integration | `FrmWeightScale_Integration` | Yarn/fabric weighbridge capture. WebUSB/serial is possible; at minimum an agent-paste flow |
| Barcode printing/scanning | `frmBarcodeReadingNew` (entry exists), print side deferred | Open decision #2 — still open |
| Attendance | HR view has an "Post Attendance via Agent" button but **no attendance tool/model/register** | Piece-rate payroll implicitly needs attendance |
| Multi-company | `Coycode` preserved in schema, dormant | Open decision #1 — still open |
| Doc-level void/amend/duplicate | every legacy form had Close/Cancel | See §5 |

---

## 5. Gap E — Behavior-level gaps (docs that can't be corrected in place)

- DocScreen view mode is read-only everywhere: **no Cancel/Void/Amend/Duplicate buttons on the doc
  itself** (amendment exists only as separate screens for order/PO/program). A mis-keyed GRN line
  currently requires knowing the amendment route or asking the agent.
- No duplicate-document ("same as last DC") — `resetForAnother` wipes everything.
- Reconciliation cards exist for PO↔GRN, Invoice↔Payment, Jobwork out↔in, Despatch↔Invoice,
  Packing↔Despatch — missing the **reverse directions** (GRN view showing its PO, DC return side).

---

## 6. Muscle Memory — preserved vs colliding (day-1 field audit of the new UI)

### 6.1 Already preserved (keep, don't regress)
Menu taxonomy with 17 legacy-familiar groups; Tirupur terminology kept (Program, DC, GAN, In-Hand,
Pcs, Godown, Bundle, Jobwork, Bill Pass, Ready to Cut); numbered documents (SO-/PO-/GRN-/DC-/
MDC-/RTC- prefixes); 15-stage chain bar + ctx-prefilled Next→; registers with drill-down + CSV;
searchable pickers with create-on-the-fly (the classic "missing master mid-entry" fix); live
totals per keystroke; Original/Duplicate/Triplicate; amount-in-words; en-IN ₹; review-before-
commit safety; recent-docs tables under every New screen.

### 6.2 Reflex collisions — the 10 that will hurt most (verified in code)
1. **Enter inside the line grid submits the whole document** (`doc-screen.tsx` `<form>` wraps the
   editor). Legacy: Enter = commit row, spawn next row. This is the #1 reflex collision.
2. **No F-keys at all** (zero F2–F12 handlers in src/). Legacy hands live on F2-save/F9-print.
3. **⌘K opens the agent, not a menu jump** — there is no command palette; the vendored cmdk
   primitive sits unused. Operators' "jump" reflex lands in a chatbot.
4. **Pickers are mouse-bound**: must click the button to open the list; Tab in doesn't open it;
   no type-code-and-Enter fast path from closed state.
5. **Date fields open blank** (no default=today); ISO date widget vs typed dd/MM/yy habit.
6. **Register rows aren't keyboard-navigable**; only the first column is a link.
7. **Sidebar accordion opens one group at a time**, no favorites/recents section.
8. **No print-on-save** (see §3-C2).
9. Two-step save (Save → review plan → Approve & commit) doubles keystrokes vs legacy single
   save — worth keeping for writes, but the back-to-edit path must be an easy Esc/target.
10. **No edit/void/duplicate on doc views** (see §5).

Also: number inputs give no ₹-formatted echo while typing; register totals band has no per-day/
per-party subtotals (the "counter book" grouping — see §7-C); master-grid "(press /)" hint is a
decoy (no global `/` listener exists).

---

## 7. The Tirupur Muscle-Memory Playbook — "how else can we tap it"

Beyond fixing §6.2, these channels use habits the legacy app *trained for 15 years* as levers:

**R — Rate memory.** Operators remember rates, not IDs (`frmDefaultRate` existed for this).
Auto-suggest last rate for party+item on every PO/GRN/invoice line; show "last: ₹180/kg on 12 Jun"
inline. Zero new models — one query over recent ledgers.

**C — Counter-book registers.** Tirupur accountants keep handwritten day-books with date-break
subtotals and running balances. Give registers a grouped mode: date/party sections, section
subtotals, running balance column (data already exists in stock/party ledgers).

**P — Paper-first rituals.** Print-on-save default per doc family (AppOption flag); 3-copy burst;
`order` doc-type print; Large + Cost-bearing templates as promised; pre-printed-stationery mode
(company block off) for units that buy printed DC books.

**D — The reminder reflex (SMS→digest).** Legacy had SMS/mail setup for a reason: the day runs on
"DC not returned", "approval pending", "party balance crossed". Ship a daily digest (agent-written,
WhatsApp/email-ready HTML) + in-app reminder center. This converts a legacy feature loss into an
agent showcase.

**E — Excel habits.** `FrmOrderRelatedInput_Excel` proves merchandisers paste from Excel. Add
paste-rows-into-grid (TSV) on order/PO/cost-sheet line grids + CSV upload. Highest adoption win
per hour of code in this whole list.

**K — Keypad-operator mode.** Shop-floor entries (production tally, pcs despatch, bundle scan)
want a stripped full-screen keypad UI with big targets — one operator, one action, zero chrome.
A `mode=keypad` skin over existing DocScreens.

**V — Voice in Tamil/Tanglish.** The agent already accepts free text; operators speak faster than
they type. Wire speech-to-text into the agent panel (Tamil + Tanglish). "ஐந்து ஆயிரம் பீஸ்
டெஸ்பாட்ச் SO-1042" → parsed to a reviewed plan. This is the deepest muscle there is: speech.

**G — Global jump bar.** One box: type "1042" or "SO-1042" → jump to doc; "frmPcsDel" legacy name
→ the Pcs DC screen; menu item names; master records. The cmdk primitive is already vendored.
Legacy users navigate by mnemonic codes — give the codes a home.

**H — Holiday/festival calendar.** `WF_PlanFinishDateArrival` skipped Sundays+holidays — Tirupur
plans around Pongal/Deepavali shutdowns. GovtHoliday master exists: surface it in delivery
promises, program dates, and the MIS (upcoming shutdown warnings).

**T — Terminology polish.** Fix "Dispatch & Logistics" → "Despatch & Logistics" (one label); keep
GAN/Program/In-Hand verbatim; hide raw tool-name chips (`receive_grn`) from operator headers;
optional Tamil labels for high-frequency fields later.

**F — F-key + grid contract (from §6.2).** The keyboard contract a 15-year operator expects:
Enter commits row & spawns next; F2 save, F4 open picker, F9 print, Esc back-to-edit / close
picker; ↑↓/Tab grid navigation with Home/End; auto-focus first header field; focus returns to
grid after picker select.

---

## 8. Data-hygiene debts found during this audit (fix cheaply)

1. 29 `legacyForms` strings in menu-registry reference names that don't exist in the taxonomy
   (renames/abbreviations/SQL objects: `ST_Ord_inHand`, `Frm_ProductionWages_Dept` vs actual
   `Frm_ProdWagesDept`, `FrmOrderReg` vs `FrmOrderRegister`, report-file names used as form
   names). Parity *measurement* is therefore fuzzy — normalize with an alias map.
2. Header comment says "ITEMS (113)" — actual 115 (live-tracker, feature-flags added later).
3. `reports/index.ts` header says "15 register bindings" — actual 16.
4. `/reports` header comment drift; also `1-ST-STATE` staleness risk — run `context_check.sh`.

---

## 9. Recommended Sequencing (proposal — needs mickey's sign-off)

**P0 — Reflex fixes (days, pure frontend):** Enter-to-add-line + swallow implicit submit; F-key
map (F2/F4/F9/Esc); date defaults today; Print button on post-commit card; full-row click +
↑↓/Enter on registers; "Despatch" label fix; hide tool chips; real global `/`.

**P1 — Muscle-Memory & Print Fidelity milestone (M13 proposal):** `order` print + invoice body
completion (HSN column, bank/remit block, phone/CIN/logo); Large + Cost-bearing templates;
print-on-save flags + 3-copy burst; command palette / global jump (cmdk); paste-into-grid (E);
rate memory (R); doc-view Cancel/Void/Duplicate actions (E-§5); FrmChangePassword.

**P2 — Register & Masters Long Tail (M14 proposal):** 5 material-wise stock registers + cutting
register + supplier pending/history + orderwise pcs + shift wages (register configs over existing
services); masters completion (Bank, Mill, Machine, State, Shade, ThreadType, CountGroup, Range);
closing-stock as-of-date; counter-book grouped register mode (C); Tally JSON export.

**P3 — Channels & Integrations (M15 proposal):** daily digest/reminder center (D); keypad-
operator mode (K); voice entry (V); attendance model+tool+register; waste receipt; e-invoice/
e-way mock; barcode decision (#2); multi-company decision (#1); holiday surfacing (H).

Numbering note (2026-08-29): P0 shipped as SPEC-M17 (`m17-reflex`) — M13–M16 were already reserved by the frozen SPEC-M9 §9 P2 roadmap (digest/perf/audit/dashboards); the P1/P2/P3 lanes below become M18+ as they are picked up.

Sequence rationale: P0 removes active pain for anyone who touches the app today; P1 completes the
*print-and-keyboard* contract that legacy users consider table stakes; P2 closes the measurable
register/master parity gaps (tracker can then honestly claim ~95% of unique legacy units);
P3 is the new-capability frontier that *builds on* (not just preserves) 15 years of muscle memory.
