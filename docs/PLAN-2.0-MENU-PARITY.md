# FiberOps 2.0 — Menu Parity & Forms × Agent Rework Plan

Date: 2026-08-26 · Status: Proposed · Owner: agent + mickey

> **⚠ CONTEXT CONTINUITY — read this first.** This plan is STRATEGY only.
> Before implementing ANY milestone, a session MUST bootstrap via
> **`docs/CONTEXT/00-START-HERE.md`** (protocol: run `scripts/context_check.sh`,
> read STATE → this plan → the milestone's SPEC in `docs/CONTEXT/specs/` →
> PITFALLS → CONVENTIONS). No milestone gets coded without its spec committed
> first. Files are the only memory — chat context and summaries are not trusted.

---

## 0. Executive Summary

The original Fiberpro is not "10 screens" — it is **321 Windows forms, 491 report files and 380+ SQL objects** organized into **14 functional modules**. Our current app has 12 thin views (single-page switcher) and an 89-tool agent. The user verdict is correct on both counts:

1. **Agent-first data entry works** — keep it, extend it.
2. **Forms are still required** — an ERP user must be able to open a screen, see data, and key in a document the classical way. Agent-only entry is a ceiling, not a floor.

This plan reworks the app into a **full-menu-parity ERP where every screen and every agent tool are two doors into the same action**. We do NOT rebuild 321 bespoke forms. Deep-dive evidence (below) shows the legacy surface collapses into **5 screen archetypes + ~45 document-family configs + ~40 master configs + a report hub**, driven by a single **menu registry** that also powers the sidebar, breadcrumbs, agent deep-links, and a live parity tracker.

| Metric | Legacy Fiberpro | FiberOps today | FiberOps 2.0 target |
|---|---|---|---|
| Reachable functions | 321 forms | 12 views + 89 tools | **~90 menu items, all reachable** |
| Data entry | Forms only | Agent only | **Forms × Agent (one action, two doors)** |
| Bespoke UI code | 321 form files | 12 view components | **5 archetype engines, config-driven** |
| Reports | 491 files (~80 unique) | none | Report hub, parameterized |
| Parity tracking | — | — | **menu registry: legacy-form → screen coverage %** |

---

## 1. Deep-Dive Findings (evidence)

Sources: decompiled assembly form list (`reverse-engineering/output/candidate-forms.txt`), module analyses (`module-functionalities/*.md` ×10), derived migration docs (`mern-requirements.md`, `modernization-module-summary.csv`), SQL triggers/views, report folders. Taxonomy script: `scripts/analyze_forms.py` → `docs/form-taxonomy.json`.

### 1.1 The numbers

| Archetype (deduped) | Legacy forms | Unique units | What they really are |
|---|---:|---:|---|
| Master entry | 52 | 52 | CRUD on ~40 reference entities; legacy itself used a generic `Frm_Master` |
| Transaction entry | 173 | 163 | **21 document families** (GRN, DC, Pcs DC, production, invoice…) |
| Register / report launcher | 47 | 43 | Filterable lists — one screen pattern |
| Approval | 18 | 18 | Queues — one inbox pattern |
| Settings | 10 | 10 | Options toggles |
| Admin (users/rights/login) | 15 | 15 | Admin pages |
| Utility dialogs | 6 | 6 | Search/popups — absorbed into shell |
| **Total** | **321** | **307** | |

Report files: 491 (`.rpt` Crystal + `.mrt` Stimulsoft + `.vb`/`.cs` code-behind) — after variant dedup (`Large/Spare/Set/Copy/old/1/2/GST/Cost` variants of the same document) ≈ **80 unique printable outputs**.

### 1.2 Document families (the DocScreen configs)

`delivery-dc` (22 forms) · `production` (13) · `order` (11) · `program` (10) · `pcs-stock` (9) · `grn` (9) · `cutting` (7) · `purchase` (8) · `lab-quality` (7) · `invoice` (7) · `jobwork` (7) · `stock-ops` (6) · `budget` (5) · `gate-logistics` (4) · `expenses` (4) · `wages` (2) · `debit-note` (2) · `costing` (1) · `bill-pass` (1) · `payment` (1) · `packing` (1) = **21 families → ~45 doc screens** (a family like `grn` splits into purchase-GRN / process-GRN / multi-process / accessories).

### 1.3 What made Fiberpro "easy despite ugly UI" (must-preserve list)

1. **Full menu taxonomy** — every operation lives in a predictable module menu; a Tirupur operator navigates by muscle memory (Order Sheet → Program → PO → GRN → DC → Cutting → Pcs DC → Bill).
2. **Document-centric flow** — every screen is a numbered document (DC/GRN/PO/Invoice with per-type prefixes) with header + grid + print.
3. **Registers everywhere** — every module exposes day-book registers (stock, party, bills, production).
4. **Next-step guidance baked into the chain** — program balances (`ST_ProgBalance_*`) tell the operator what is pending per order. Our `suggest_next_step` is the modern equivalent.
5. **Approval gates** — GRN acceptance, rate confirmation, bill pass, lot approval, reprocess approval.
6. **Print is a first-class citizen** — the operator's day ends with paper: DCs, order sheets, packing lists, invoices.

### 1.4 Legacy debt we will NOT port

- 18+ print-format variants per document → 3 templates (A4-GST, Large, Cost-bearing).
- `Report - Copy/` and `OLD Report/` folders — dead forks.
- `Frm_Password_List` (admin can view passwords) — replaced by proper reset flow.
- IP-scoped temp tables for concurrent reports → real parameterized queries.
- `UpdateFlg`/`server_id` replication triggers → event log table.
- Magic numbers (DeptID 4/8/10/11/−7, TrType 1..20, SizeID −2, AddDedCode 40/41/42) → named enums in one file.
- `_New`/`_old` form forks → versioned schema + migration.

---

## 2. Product Principles (the mould)

**P1 — Menu parity, not form parity.** Users coming from Fiberpro must find every operation where their muscle memory expects it. The menu tree mirrors the legacy taxonomy; the screens behind them are modern.

**P2 — One action, two doors.** Every write operation is reachable BOTH as a form (manual entry, keyboard-first) AND as an agent tool (chat, PDF ingest). Both doors execute the same service function. No door is a second-class citizen.

**P3 — No dead ends.** Every menu item is clickable from day one. Unbuilt items open the module's coming-soo page that lists what will live there AND a chat box pre-targeted to that domain ("Ask the agent to do this now" — the agent already covers most write ops).

**P4 — Config over code.** Screen archetypes are engines; each menu item is a registry entry (schema, columns, doc-type, posting effects, agent tool). Adding the 40th master = writing a config object, not a component.

**P5 — The chain is the product.** Order → Program → PO → GRN → Jobwork → Cut → Line → Production → Despatch → Invoice → Cost → Collection. Every list row exposes "next step"; every doc screen shows where it sits in the chain (mini pipeline bar).

**P6 — Registers are read + ask.** Every register screen pairs the filterable grid with an "Ask about this data" box that hands the filtered context to the agent.

---

## 3. The Menu Tree (full parity map)

Legend: **Phase** = delivery milestone (§6). **Tool** = agent tool already live (✓) / to add (＋).
Archetypes: `MT` MasterTable · `DS` DocScreen · `RG` RegisterScreen · `DB` Dashboard · `IN` ApprovalInbox · `RH` ReportHub · `ST` Settings.

### 3.1 Home
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Dashboard | — | DB | M1 | ✓ get_dashboard_kpis |
| Order Status Board | frmOrdStat, FrmBuyerStatus, FrmOrderDespatchCompletion | DB | M4 | ✓ suggest_next_step |
| Daily In/Out | frmDailyinout | RG | M4 | ＋ |

### 3.2 Orders & Sales
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Order Sheet (new) | FrmOrderSheetNew, _Domestic, _WithAmend, FrmTradingOrderSheet | DS | M3 | ✓ create_order |
| **Order Hub (detail)** | FrmOrdProdTrack, FrmIoHistoryReg, FrmBuyerStatus | RG+DS | M3 | ✓ get_order + suggest_next_step |
| Order Enquiry / Search | FrmOrderEnquiry, frmSearch | RG | M3 | ✓ list_orders |
| Order Register | FrmOrderReg, frmordwiseregregister, FrmOrderRegister_Spl | RG | M4 | ✓ list_orders |
| Amendments | FrmOrderSheetAmendment | DS | M3 | ✓ update_order |
| Order Close | FrmOrderClose | DS | M3 | ＋ close_order |
| In-Hand Orders | ST_Ord_inHand | RG | M4 | ＋ list_inhand_orders |
| Samples & Enquiry | frmOrderSample, FrmSampleEntry_WithEnquiry | DS | M5 | ＋ |
| Commercial Invoice | FrmCommericalInv_New, FrmInvComm | DS | M5 | ＋ |

### 3.3 Programs (Tirupur core)
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Program Entry | frmProgEntry, frmProgNew, _Actual, _YarnCons | DS | M3 | ✓ create_program |
| Program Status | — (ST_ProgBalance_*) | RG | M3 | ✓ get_program_status |
| Program Cancel | frmProgCancel, FrmAcc_ProgCancel, _Compwise | DS | M3 | ＋ cancel_program |
| Program Complete | FrmProgramComplete | DS | M3 | ＋ |
| Fabric / Acc Allotment | frmFabricAllotment, frmComboWiseReqRpt | DS | M5 | ＋ |

### 3.4 Procurement
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Purchase Order | frmPurchaseOrd_MultiOrder, _HO, frmPurchaseOrdAcc, frmGeneralPurchaseOrd | DS | M3 | ✓ create_purchase_order |
| PO Cancel / Complete | FrmPOCancel, frmPoCompl | DS | M3 | ✓ cancel_purchase_order |
| GRN Entry | frmGRNEntry, _MultiOrder, frmGRNEntryAcc, _Ret_Multi | DS | M3 | ✓ receive_grn |
| Multi-Process GRN | frmGRN_MultiProcess, frmPrsGRNMulti, _Compwise | DS | M3 | ＋ |
| GRN Acceptance | FrmPurGrnAccept, FrmProGrnAccept | IN | M3 | ✓ approve_pending |
| Supplier Orders | FrmSuppOrdSheet_Semi, FrmSuppProdSequence, FrmSuppTechDataSheet | DS | M5 | ＋ |
| Rate Confirmation | RptYarnRateConfirm, RptFabRateConfirm, RptAccRateConfirm | RG | M5 | ＋ |
| Party Balance | FrmPartyBlnc, Sp_POBalnce | RG | M4 | ✓ get_party_ledger |

### 3.5 Inventory & Warehouse
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Stock View (live) | frmStockView, frmfabstockshow, frmYarnStockShow, frmAccStockShow, frmAccShort | RG | M2 | ✓ get_stock |
| Stock Ledger | FrmStockLedger, Vue_StkLedger | RG | M4 | ✓ get_stock_ledger |
| Stock Register | FrmStockRegister, _Style, _StylePcs, _SplRpt, Itemwise/General | RH | M4 | ＋ |
| Opening Stock | frmOpeningStock, _CompWise, frmPcsStagewiseOpeningStock | DS | M2 | ＋ post_opening |
| Stock Adjustment | frmStockAdjustment, _Domestic | DS | M3 | ✓ adjust_stock |
| Godown Transfer + Ack | FrmStkTransfer, FrmChangeGodown, FrmGoDownAck, FrmGodownTransferAck | DS | M3 | ＋ transfer_stock |
| Lot Tracking | FrmLotRegister, frmLotWiseDtl, FrmLotSeparate, frmLotApproval→approvals | RG | M4 | ✓ list_lots |
| Roll Tracking / Split | Frm_RollSplit, CurrentStock_RollDtl | DS | M5 | ＋ |
| IO History | FrmIoHistoryReg, _New | RG | M4 | ＋ |

### 3.6 Cutting & Panels
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Cutting Job Order | frmCuttingJobOrder | DS | M3 | ✓ create_cut_order |
| Cutting Issue | frmCuttingIssue | DS | M3 | ＋ issue_fabric_to_cut |
| Ready to Cut | frmReadytoCut (virtual dept −7) | DS | M3 | ＋ ready_to_cut |
| Cutting Production | FrmCuttingProduction_Auto_New | DS | M3 | ✓ post_production_entry |
| Cutting Ack | frmcuttingack | IN | M3 | ＋ |
| Panel Cutting / Add | frmAddPanelCutting | DS | M5 | ＋ |
| Panel Production | frmProduction_CutPanel | DS | M5 | ＋ |
| Panel Rej / Rework | frmPanelRej, frmPanelDelRework | DS | M5 | ✓ post_rejection |
| Panel Excess | FrmPanelExcessEntry, _Stage | DS | M5 | ＋ |
| Fabric Rejection Return | FrmCutting_FabRej, FrmCuttingfabretreg | DS | M5 | ＋ |

### 3.7 Pieces (Finished Goods)
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Pcs DC (Despatch) | frmPcsDel, _Ship, frmPcsDelRework | DS | M3 | ✓ create_pcs_despatch |
| Pcs Receipt | frmPcsRec | DS | M3 | ✓ receive_jobwork |
| Pcs GRN Acceptance (GAN) | FrmProGrnAccept (pcs variant) | IN | M3 | ＋ |
| Pcs Transfer | FrmPcsGodTransfer | DS | M3 | ＋ |
| Pcs Rejection | frmPcsRej | DS | M3 | ✓ post_rejection |
| Pcs Shortage | frmPcsShort, frmShortage, _Compwise, FrmShortageBitEntry | DS | M5 | ＋ |
| Pcs Stock | FrmPieceStock, _All, FrmRejPieceStock | RG | M4 | ✓ get_stock |
| Finished Goods Entry | FrmFinishGoodsEntry | DS | M5 | ＋ |
| Packing List | FrmPackingList, _Domestic, FrmLocalInvPackingList, _Solid, Format | DS | M5 | ＋ |

### 3.8 Production & Shopfloor
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Production Entry | frmProduction | DS | M3 | ✓ post_production_entry |
| Issue to Line | FrmIssueToProduction, FrmLineInput, _Manual | DS | M3 | ✓ issue_to_line |
| Line Output | frmLineOutputManual, _New | DS | M3 | ＋ |
| Line Status / WIP | — (EmpID-as-LineID) | DB | M3 | ✓ get_line_status |
| Rework | post_rework semantics | DS | M3 | ✓ post_rework |
| Bundle / Barcode Entry | FrmBundle_ProductionEntry, frmBarcodeReadingNew | DS | M5 | ＋ scan_bundle |
| Line Transfer | Trs_LineTfr | DS | M5 | ＋ |
| Operation Entry | FrmOperationEntry, Frm_SubProcess | DS | M5 | ＋ |
| Production Status Register | FrmProductionStatusReg, FrmInhouseProductionStatusReg | RG | M4 | ＋ |

### 3.9 Job Work (Outsourcing)
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Jobwork Order (out) | create_jobwork_order semantics | DS | M3 | ✓ create_jobwork_order |
| Jobwork Receipt (in) | receive_jobwork semantics | DS | M3 | ✓ receive_jobwork |
| Contract Allotment | frmContractAllotment, _New | DS | M5 | ＋ |
| Job Order List / Balance | FrmJobOrderList, party/unit-wise balances | RG | M4 | ✓ list_jobworks |
| Jobwork Pcs Return | frmJobWorkPcsReturn | DS | M5 | ＋ |

### 3.10 Dispatch & Logistics
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Fabric/Yarn/Acc/Gen DC | FrmFabDel, FrmAccDel, FrmGenDC, Yarn DC variants | DS | M3 | ＋ create_dc |
| Process DC (multi) | frmPrsDelMulti, _Acc, _Compwise | DS | M3 | ＋ |
| DC Return | FrmAccDel_Return, FrmFabDel_Return, RPtFabDcRet | DS | M3 | ＋ |
| Gate Entry | FrmGateEntry, FrmDirectBill_GateEntry | DS | M5 | ＋ |
| Gate Pass | FrmGatePass, Options.GatePassFlg | DS | M5 | ＋ |
| Unit Transfer Ack | FrmUnitTransferAck | IN | M5 | ＋ |
| Courier DC | CourierDC | DS | M6 | ＋ |
| Loading | FrmLoading | DS | M6 | ＋ |

### 3.11 Accounts & GST
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Sales Invoice | frmSalINV, frmNewInv | DS | M3 | ✓ create_sales_invoice |
| Local Invoice | FrmLocalInvoice, FrmLocalInvConfirm | DS | M5 | ＋ |
| Piece / Jobwork Invoice | frmPieceInv, _1, Rpt_JobwrkInvoice | DS | M5 | ＋ |
| Debit Note | frmdebitnote, frmDirectDebitNote | DS | M3 | ✓ create_debit_note |
| Bill Pass | frmBillPass | IN | M5 | ＋ |
| Bills Register | FrmBillsReg, FrmBillsAddDedReport, 10 dept variants | RG | M4 | ＋ |
| Supplier Bill Register | FrmSupplierBillReg | RG | M4 | ＋ |
| Payments & Receipts | FrmPaymentReg | DS | M3 | ✓ record_payment |
| Party Ledger | FrmPartyBalanceRegister | RG | M4 | ✓ get_party_ledger |
| Journal | — | DS | M3 | ✓ create_journal |
| Production Bills (piece-rate) | FrmProdBillNew | DS | M5 | ＋ |
| HSN / GST Setup | FrmHSN, FrmHSNPce, FrmTally_GSTSetup | ST | M2 | ＋ |

### 3.12 Costing & Budgets
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Cost Sheet | create_cost_sheet semantics | DS | M3 | ✓ create_cost_sheet |
| Costing Input | Frm_CostingInput, multi-level daily | DS | M5 | ＋ |
| Budget | frmBudget, frmBudgetNew_JobWork, frmPreBudgetProdPlan | DS | M5 | ＋ create_budget |
| Budget vs Actual | FrmBudgetAndActualComp | RG | M4 | ✓ get_budget_vs_actual |
| Expenses | FrmExpenses, FrmFixedExpensesEntry, FrmStylewiseExpensesEntry | DS | M5 | ＋ |
| Daily Unit P&L | Sp_DailyUnitPANDL | RH | M6 | ＋ |
| Piece-Rate Confirmation | RptPieceRateConfirm, _InHouse | RH | M5 | ＋ |

### 3.13 HR & Payroll
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Employees & Contractors | FrmEmpmaster | MT | M2 | ✓ create_employee |
| Shifts & Hours | frmHours, FrmHourlySetting1 | MT | M5 | ＋ |
| Production Wages | Frm_ProductionWages, _Dept, _Stage | DS | M5 | ＋ |
| Wage Payments | FrmPaymentReg_Wages | DS | M5 | ＋ |

### 3.14 Quality & Lab
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Lab Test Entry | FrmLabTest, FrmNewLabTest | DS | M5 | ＋ |
| Test Parameters / Stages | FrmLabTestParameters, _Stages, _InputParameters | MT | M2 | ＋ |
| Lot Approval | frmLotApproval | IN | M3 | ＋ |
| Reprocess Approval | FrmReprocess_Approval | IN | M5 | ＋ |
| Non-Return DC Approval | FrmNonReturnDCApproval | IN | M5 | ＋ |

### 3.15 Approvals & Workflow (cross-module inbox)
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Approval Inbox | all 18 approval forms | IN | M1 | ✓ get_pending_approvals |
| Approval Audit Trail | AgentTurn log | RG | M4 | ＋ |

### 3.16 Reports & Analytics
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| Report Hub | ~491 files → ~80 unique | RH | M6 | ＋ render_report |
| Order / Production / Inventory / Accounts packs | domain .rpt/.mrt sets | RH | M6 | ＋ |
| MIS Dashboard | frmMIS, FrmMISSetting | DB | M6 | ＋ |

### 3.17 Masters & Admin
| Menu item | Legacy form(s) | Arch | Phase | Tool |
|---|---|---|---|---|
| All masters (~40 entities) | 52 master forms (Party, Buyer, Style, Fabric, Yarn, Acc, Colour, Size, SizeGroup, Dia, Lot, Season, Merchandiser, Godown, Dept, Emp, UOM, HSN, Bank, Machine, Mill, State, Design, Shade, Part, Component, Thread, CountGroup, Range…) | MT | M2 | ✓ 21 create_* tools live |
| Users & Groups | FrmMasuser, FrmUserGroupMas | ST | M6 | ＋ |
| Menu Rights | FrmMenuRights, FrmMenuAccRights | ST | M6 | ＋ |
| Company / FinYear | FrmCompanyLogin, FrmCompanyRights, FrmFinyearLogin | ST | M2/M6 | ✓ create_fin_year |
| Options & Settings | frmOptions, FrmOptionsPrint, frmDeptSettings | ST | M6 | ＋ |

**Totals: 17 groups · ~90 menu items · every legacy form mapped.**

---

## 4. Screen Archetype Engines

### 4.1 MasterTable `MT` — kills 52 forms with one engine
Config-driven CRUD: `{ entity, title, columns[], formSchema (zod→react-hook-form), searchFields, agentTools: {list, create, update} }`. Grid + slide-over create/edit form + inline search + CSV export. Every master config ≈ 30 lines of TypeScript in `src/lib/erp/master-configs/`. **~40 configs replace 52 legacy forms.**

### 4.2 DocScreen `DS` — the transaction workhorse
The Fiberpro mental model: a numbered document (header card + line grid + totals + print). Config: `{ docType, numberPrefix, headerSchema, lineSchema, stockEffects (posting), printTemplate, chainPosition, agentTool }`. Three modes:
- **New** — keyboard-first form (add line rows, F-key save/print).
- **View** — from register click; shows posting effects and chain position.
- **AI-prefill** — "Fill with AI" button opens inline chat pre-seeded with this doc type; agent proposal renders INTO the same form (user reviews, edits, saves — no separate approval card needed when entering via form; approval card in chat remains the other door).

### 4.3 RegisterScreen `RG` — kills 43 register forms + 150 report-launchers
Parameterized day-book: `{ title, source (Prisma view/service), filters (date/party/order/dept/godown), columns, groupTotals, drillDown }`. Row click → DocScreen view or MasterTable. "Ask about this data" button passes filter context to the agent panel.

### 4.4 ApprovalInbox `IN` — kills 18 approval forms
Single queue fed by all pending states (workflow engine + GAN + bill pass + rate confirmation + lot/reprocess approvals). Approve/reject with remarks; every decision writes AgentTurn audit.

### 4.5 DashboardScreen `DB` / ReportHub `RH`
DB: KPI tiles + charts + pipeline board (per-order 15-stage progress). RH: `{ reportKey, params, renderer }` — HTML/Recharts preview, PDF/CSV export, saved presets. Print templates consolidated to 3 per doc family.

### 4.6 The Wiring Layer — links between screens and forms

The menu gets users to the right screen; **the wiring is what made Fiberpro feel easy**. Six wiring patterns, all config-driven (declared in the same registry entries as the screens — wiring is data, not bespoke code):

**W1 — Chain wiring (the pipeline).** Every DocScreen renders a mini pipeline bar (15 stages, current stage highlighted) with a **"Next →" CTA** that opens the next step's form **pre-filled** from context (`/procurement/grn/new?order=SO-1001&po=PO-0007`). Register rows carry the same next-step chip. This is the form-side twin of the agent's `suggest_next_step` — one chain definition powers both.

**W2 — Drill-down wiring.** Register row click → DocScreen view mode. In every doc view, each reference field (buyer, style, order, party, PO) is a clickable link opening that record. Dashboard KPI tiles deep-link to pre-filtered registers. Breadcrumbs trace back up.

**W3 — Order Hub (the relation graph).** `/orders/[id]` shows the order's entire document family on one page: programs, POs, GRNs, DCs, jobworks, cut orders, production, despatches, invoices, payments — grouped, qty/value rolled up, each row linking to its doc view. Modern replacement for Fiberpro's `FrmOrdProdTrack` / `FrmIoHistoryReg` / order status registers. Every "where is this order stuck?" question is answerable without the agent.

**W4 — Picker wiring (forms inside forms).** DocScreen reference fields are searchable pickers (buyer, style, fabric, colour, size, godown, party) with **create-on-the-fly**: "+ New" opens the MasterTable slide-over; on save the draft doc keeps its state and the new master is auto-selected. Nobody loses a half-keyed document to missing master data — the classic Fiberpro pain.

**W5 — Agent ↔ form context handoff.** (a) "Fill with AI" button on every DocScreen — the agent's proposal lands in the form for review/edit; (b) "Ask about this data" on every register passes active filters as agent context; (c) the chat's next-step answer carries an "Open form" button mirroring `nextFormUrl`. Chat and forms are mutually navigable in both directions.

**W6 — Doc-to-doc reconciliation links.** Each doc view shows its counterpart documents inline with live balances: PO ↔ GRNs (ordered vs received vs balance), DC ↔ GRN (sent vs received, `OurDcref` semantics), Invoice ↔ Payments (billed vs collected), Jobwork out ↔ in (issued vs returned, at-party balance). Modern version of `Vue_GrnRegFab_PO` and the party-balance SP family — the "what's pending against what" wiring.

**Wiring is declared, not coded:** each DocScreen config carries `chainPosition`, `refs[]` (linkable fields), `counterpartDocs[]` (reconciliation pairs); each register config carries `drillDown`; the menu registry is the spine, these link definitions are the nerves.

---

## 5. Form × Agent Duality (architecture)

```
                 ┌────────────── PostingEngine (service layer) ──────────────┐
                 │  createOrder / postGRN / postDC / postProduction / ...    │
                 │  (pure functions: input → {doc, ledgerEffects, balances}) │
                 └───────────▲───────────────────────────▲───────────────────┘
                             │                           │
                    server actions                agent tools (thin wrappers)
                             │                           │
                   ┌─────────┴─────────┐        ┌────────┴────────┐
                   │  Form (DocScreen) │        │  Chat (agent)   │
                   │  keyboard-first   │        │  plan/approval  │
                   └───────────────────┘        └─────────────────┘
```

**Rules:**
1. **One service function per operation.** Extract posting logic out of `tools.ts` into `src/lib/erp/posting/*.ts`; tools become thin wrappers; form server actions call the same functions. Form/agent behavior can never drift.
2. **Shared zod schemas.** The form's react-hook-form schema and the tool's input schema are the SAME zod object (`src/lib/erp/schemas/*.ts`). AI prefill, validation, and agent calls share one definition.
3. **suggest_next_step deep-links.** Its result gains `nextFormUrl` (e.g. `/procurement/grn/new?order=SO-1001&po=PO-0007`) — chat can offer "Open the form, pre-filled".
4. **Every DocScreen embeds the agent** via the "Fill with AI" inline box; the global panel (Cmd+K) stays.
5. **Registers hand context to the agent** — filtered rows become a context attachment.
6. **PDF ingest lands in the form** — document extraction proposals open a DocScreen in AI-prefill review mode instead of only a chat card.

---

## 6. Phased Roadmap

### M1 — App shell & menu registry (the skeleton) · ~2 sessions
- Move from view-switcher to real App Router routes (`/orders`, `/procurement/grn`, …).
- `src/lib/erp/menu-registry.ts`: every §3 row as `{id, label, group, route, arch, legacyForms[], phase, tool}`; sidebar, breadcrumbs, mobile nav, and footer parity tracker all derive from it.
- Coming-soo page per unbuilt route: what's coming + which agent tool already covers it + chat box.
- Approval Inbox shell (already tool-backed).
- **Accept:** all ~90 menu items clickable; tracker shows live/coming counts; zero dead links.

### M2 — MasterTable engine + masters · ~2 sessions
- Engine + master configs for all 24 schema master entities; migrate existing masters view; company/fin-year screen.
- *(Re-sequenced by ADR-013: HSN master → M6; opening stock (`post_opening`) → M3 posting era; BOM editor → M3 style DocScreen. M2 is pure single-table CRUD, zero schema changes.)*
- **Accept:** create/edit/search/export for every master via form AND agent; legacy 52 master forms covered; form and agent run the same service functions (test-asserted). Spec: `docs/CONTEXT/specs/SPEC-M2.md`.

### M3 — DocScreen engine + the 15-stage chain forms · ~3-4 sessions
- PostingEngine refactor (services out of tools.ts) + shared zod schemas.
- Doc screens: Order, Program, PO, GRN (purchase/process/multi), DC family, Cutting set, Issue-to-line, Production, Pcs DC/Receipt/Transfer/Rejection, Jobwork out/in, Invoice, Debit note, Payment, Cost sheet, Stock adjustment/transfer.
- Wiring layer M3 slice: chain mini-pipeline bar + "Next →" pre-filled CTA on every doc screen; **Order Hub live** (`/orders/[id]` shows the full document family with rollups and links); doc reference fields are clickable links; pickers with create-on-the-fly; `nextFormUrl` in suggest_next_step.
- **Accept:** full Tirupur chain executable entirely through forms; form saves and agent commits produce identical ledger effects (test-asserted); from an order's hub page every downstream/upstream document is reachable in ≤1 click.

### M4 — RegisterScreen engine + core registers · ~2 sessions
- Stock ledger/register, order register/status, in-hand, party ledger, bills register, production status, IO history, jobwork balances.
- Wiring layer M4 slice: register→doc drill-down on every register; KPI tiles deep-link to filtered registers; doc-to-doc reconciliation panels (PO↔GRN, DC↔GRN, Invoice↔Payment, Jobwork out↔in) on doc views.
- **Accept:** top-20 legacy registers reproduced; "Ask about this data" live; every register row drills into its document.

### M5 — Extended doc families · ~3 sessions
- Gate entry/pass, packing list, lab tests, supplier orders, contract allotment, wages, expenses, budget, panel family, local/piece invoices, bill pass, roll split, barcode bundle entry, shortage, finished goods.
- **Accept:** ~70 of ~90 menu items live; parity tracker ≥ 85% of unique legacy units.

### M6 — Reports, MIS, admin, print · ~3 sessions
- ReportHub (~80 unique reports), MIS dashboard, daily P&L, users/menu-rights, options, 3 print templates per doc family, CSV/PDF export.
- **Accept:** parity tracker = 100% of §3 menu items live.

---

## 7. New Agent Tools (gaps surfaced by the map)

`close_order` · `cancel_program` · `complete_program` · `list_inhand_orders` · `create_dc` (fabric/yarn/acc/general + returns) · `transfer_stock` · `ready_to_cut` · `issue_fabric_to_cut` · `post_opening` · `scan_bundle` · `create_gate_entry` · `create_packing_list` · `create_lab_test` · `create_budget` · `render_report` · `create_supplier_order` · `confirm_rate` · `pass_bill` · `post_wages` · `create_expense` — each ships in the same phase as its form (P2: two doors or none).

---

## 8. Risks & Open Decisions

| Risk | Mitigation |
|---|---|
| Scope creep to 321 bespoke forms | P4 config-over-code; archetype engines reviewed before each phase |
| Form/agent drift | Shared services + shared zod; E2E tests assert identical posting effects |
| Sandbox rollbacks wiping work | Local git checkpoint tags per phase; push to GitHub on PAT availability |
| Menu overwhelming new users | Grouped sidebar (17 groups), search-in-menu (Cmd+P), role-filtered menus later |
| Print fidelity expectations | 3 templates only; print-CSS PDF; bespoke formats via report hub config |

**Open decisions (for user):**
1. Keep single-company assumption for now (legacy is multi-company `Coycode`)? Recommend: field preserved, UI single-company until M6.
2. Barcode bundle flow (legacy `Fiber_production` DB): full port in M5 or defer to M7?
3. Tally export: JSON export adapter (cheap) in M6 or skip?
