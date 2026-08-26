# SPEC-M1 — App Shell & Menu Registry

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M1 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M1 correctly from this file alone. Source of truth for the item table:
> `docs/PLAN-2.0-MENU-PARITY.md` §3 (transcribed row-by-row below — do not re-derive).
> Status: APPROVED FOR IMPLEMENTATION.

## 1. Goal

Replace the single-page view-switcher (`src/app/page.tsx` + ViewKey state) with a real
App Router shell: every one of the **113 menu items** (plan §3 says "~90"; exact count
is 113 — counted from the transcribed table below) is clickable from day one via the
sidebar; unbuilt items open a registry-driven coming-soon page; a parity tracker shows
live/coming progress; the Approval Inbox gets a real route.

**Acceptance (all must pass):**
1. `npx tsc --noEmit` — no NEW errors (pre-existing noise list in PITFALLS #10 is exempt).
2. `npx vitest run` — existing 15 pipeline tests still pass + new registry unit tests pass.
3. All 113 registry items resolve to an href (live route or `/coming/<id>`) — zero dead links.
4. Every route in `LIVE_ROUTES` (§4) renders HTTP 200 (dev-server smoke test).
5. Sidebar derives 100% from the registry (no hardcoded nav entries).
6. `/parity` page + footer strip show correct counts: items live/coming, groups live/coming,
   legacy-form coverage % (live items' legacyForms / 321).
7. Coming-soon page for a tool-backed item shows the "Ask the agent" button that opens the
   global agent panel with a seeded prompt.

## 2. Non-goals (explicitly OUT of M1 scope)

- No new business logic, no agent tool changes, no schema changes.
- No Cmd+P menu search, no role-based menu filtering (plan §8 mitigations, later).
- No changes inside the 11 existing view components (only re-homing wrappers).
- No MasterTable/DocScreen/RegisterScreen engines (M2+).
- No breadcrumb for deep future routes that don't exist yet (only live routes + coming pages).

## 3. Frozen types (`src/lib/erp/menu-registry.ts`)

```ts
export type Archetype = 'DB' | 'MT' | 'DS' | 'RG' | 'IN' | 'RH' | 'ST'
export type Phase = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6'

export interface MenuGroup {
  id: string          // kebab-case, e.g. 'orders'
  label: string       // 'Orders & Sales'
  icon: string        // lucide-react icon NAME (component map lives in nav-sidebar.tsx)
  landingRoute: string // live route OR '/coming/<groupId>' when group has no screen yet
  order: number       // sidebar position
  description: string // one line, used on the group's coming-soon page
}

export interface MenuItem {
  id: string           // unique kebab-case, e.g. 'grn-entry'
  label: string        // sidebar label
  description: string  // 1–2 lines: what this screen does (rendered on coming-soon page)
  groupId: string      // FK → MenuGroup.id
  route: string        // CANONICAL future route (e.g. '/procurement/grn'). May not exist yet.
  arch: Archetype      // engine that will power it (§5 table)
  phase: Phase         // delivery milestone (frozen from plan §3)
  legacyForms: string[] // legacy WinForms covered (evidence: docs/form-taxonomy.json)
  agentTools: string[] // agent tools ALREADY live that cover this function
  pendingTools: string[] // tools to add in this item's phase (plan §7)
  agentPrompt?: string // seed prompt for the coming-soon "Ask the agent" button
  notes?: string
}

// ---- helpers exported by the same file ----
export const MENU_GROUPS: MenuGroup[]      // 17 groups, sorted by order
export const MENU_ITEMS: MenuItem[]        // 113 items (§5 table, exact order)
export const LIVE_ROUTES: Set<string>      // §4 — the ONLY place liveness is declared
export function isLive(item: MenuItem): boolean        // LIVE_ROUTES.has(item.route)
export function getHref(item: MenuItem): string        // isLive ? item.route : `/coming/${item.id}`
export function groupLandingHref(g: MenuGroup): string // LIVE_ROUTES.has(g.landingRoute) ? g.landingRoute : `/coming/${g.id}`
export function findItemById(id: string): MenuItem | undefined
export function findGroupById(id: string): MenuGroup | undefined
export function itemsByGroup(groupId: string): MenuItem[]
export function findItemByRoute(pathname: string): MenuItem | undefined // exact match on route
export function findGroupByLanding(pathname: string): MenuGroup | undefined
export function parityStats(): {
  totalItems: number; liveItems: number; comingItems: number
  totalGroups: number; liveGroups: number
  legacyMapped: number   // sum of legacyForms across ALL items (≈321)
  legacyLive: number     // sum of legacyForms across LIVE items
  coveragePct: number    // legacyLive / legacyMapped * 100, 1 decimal
}
```

**Rules:**
- `route` NEVER changes after M1 (agent deep-links, `nextFormUrl`, breadcrumbs will use it).
- `phase` is frozen from plan §3; changing it requires a plan edit + ADR.
- `LIVE_ROUTES` is the single source of "what is built". It grows per milestone; never
  hardcode liveness anywhere else.
- Legacy form counts: `legacyMapped` will total ≈321 (some plan rows use shorthand like
  "18 approval forms" / "52 master forms" — encode these as literal arrays expanded from
  `docs/form-taxonomy.json`; the exact total is whatever the arrays sum to — report it,
  don't force it to 321).

## 4. LIVE_ROUTES (M1 set) — what renders today

```ts
export const LIVE_ROUTES = new Set([
  '/',              // Dashboard (re-homed Dashboard view)
  '/orders',        // OrdersView
  '/procurement',   // ProcurementView
  '/inventory',     // InventoryView
  '/cutting',       // CuttingView
  '/production',    // ProductionView
  '/accounts',      // InvoicesView
  '/costing',       // CostingView
  '/hr',            // HrView
  '/masters',       // MastersView
  '/approvals',     // WorkflowView (this IS the Approval Inbox shell, tool-backed)
  '/parity',        // parity tracker page (M1 utility, footer-linked; not a menu item)
  '/coming',        // prefix for dynamic coming-soon pages
])
```

→ Live items in M1: `dashboard` (/), `approval-inbox` (/approvals), `masters` (/masters) = 3.
→ Live group landings: 11 of 17. Coming groups (landing = `/coming/<groupId>`):
`programs`, `pieces`, `jobwork`, `dispatch`, `quality`, `reports`.

## 5. The registry data (frozen — transcribe EXACTLY)

### 5.1 Groups (17)

| # | id | label | icon (lucide) | landingRoute | live? | description |
|---|---|---|---|---|---|---|
| 1 | home | Home | `LayoutDashboard` | `/` | ✅ | KPIs, order status board, daily in/out |
| 2 | orders | Orders & Sales | `ClipboardList` | `/orders` | ✅ | Order sheets, hub, registers, amendments |
| 3 | programs | Programs | `Workflow` | `/coming/programs` | ⬜ | Tirupur core: yarn/fabric programs & balances |
| 4 | procurement | Procurement | `ShoppingCart` | `/procurement` | ✅ | POs, GRNs, acceptance, party balance |
| 5 | inventory | Inventory & Warehouse | `Boxes` | `/inventory` | ✅ | Stock, ledger, lots, transfers |
| 6 | cutting | Cutting & Panels | `Scissors` | `/cutting` | ✅ | Job orders, ready-to-cut, panel ops |
| 7 | pieces | Pieces (Finished Goods) | `Shirt` | `/coming/pieces` | ⬜ | Pcs despatch/receipt/transfer/stock/packing |
| 8 | production | Production & Shopfloor | `Factory` | `/production` | ✅ | Entries, line issue/output, WIP, bundles |
| 9 | jobwork | Job Work | `Handshake` | `/coming/jobwork` | ⬜ | Outsourced jobwork out/in & balances |
| 10 | dispatch | Dispatch & Logistics | `Truck` | `/coming/dispatch` | ⬜ | DCs (all materials), gate, courier, loading |
| 11 | accounts | Accounts & GST | `Receipt` | `/accounts` | ✅ | Invoices, bills, payments, journals, HSN |
| 12 | costing | Costing & Budgets | `Calculator` | `/costing` | ✅ | Cost sheets, budgets, expenses, P&L |
| 13 | hr | HR & Payroll | `Users` | `/hr` | ✅ | Employees, shifts, wages |
| 14 | quality | Quality & Lab | `FlaskConical` | `/coming/quality` | ⬜ | Lab tests, parameters, approvals |
| 15 | approvals | Approvals & Workflow | `CheckCircle2` | `/approvals` | ✅ | Cross-module approval inbox + audit |
| 16 | reports | Reports & Analytics | `BarChart3` | `/coming/reports` | ⬜ | Report hub, packs, MIS |
| 17 | masters-admin | Masters & Admin | `Database` | `/masters` | ✅ | ~40 masters, users, rights, options |

### 5.2 Items (113) — `id | label | route | arch | phase | agentTools | pendingTools`

Legacy forms are abbreviated below (`lf:` = legacyForms array, comma-separated).
`agentPrompt` seeds are listed in §8; fallback when absent: `"${label} — do this via chat"`.

**home (3)**
1. `dashboard` | Dashboard | `/` | DB | M1 | `get_dashboard_kpis` | lf: —
2. `order-status-board` | Order Status Board | `/orders/status` | DB | M4 | `suggest_next_step` | lf: frmOrdStat, FrmBuyerStatus, FrmOrderDespatchCompletion
3. `daily-in-out` | Daily In/Out | `/registers/daily-in-out` | RG | M4 | — | lf: frmDailyinout

**orders (9)**
4. `order-sheet-new` | Order Sheet (new) | `/orders/new` | DS | M3 | `create_order` | lf: FrmOrderSheetNew, FrmOrderSheetNew_Domestic, FrmOrderSheetNew_WithAmend, FrmTradingOrderSheet
5. `order-hub` | Order Hub (detail) | `/orders/[id]` | DS | M3 | `get_order`, `suggest_next_step` | lf: FrmOrdProdTrack, FrmIoHistoryReg, FrmBuyerStatus · notes: RG+DS hybrid; full doc-family page (W3)
6. `order-enquiry` | Order Enquiry / Search | `/orders/enquiry` | RG | M3 | `list_orders` | lf: FrmOrderEnquiry, frmSearch
7. `order-register` | Order Register | `/orders/register` | RG | M4 | `list_orders` | lf: FrmOrderReg, frmordwiseregregister, FrmOrderRegister_Spl
8. `order-amendments` | Amendments | `/orders/amendments` | DS | M3 | `update_order` | lf: FrmOrderSheetAmendment
9. `order-close` | Order Close | `/orders/close` | DS | M3 | — | pend: `close_order` | lf: FrmOrderClose
10. `inhand-orders` | In-Hand Orders | `/orders/in-hand` | RG | M4 | — | pend: `list_inhand_orders` | lf: ST_Ord_inHand
11. `samples-enquiry` | Samples & Enquiry | `/orders/samples` | DS | M5 | — | lf: frmOrderSample, FrmSampleEntry_WithEnquiry
12. `commercial-invoice` | Commercial Invoice | `/orders/commercial-invoice` | DS | M5 | — | lf: FrmCommericalInv_New, FrmInvComm

**programs (5)**
13. `program-entry` | Program Entry | `/programs/new` | DS | M3 | `create_program` | lf: frmProgEntry, frmProgNew, frmProgEntry_Actual, frmProgEntry_YarnCons
14. `program-status` | Program Status | `/programs/status` | RG | M3 | `get_program_status` | lf: ST_ProgBalance_Yarn, ST_ProgBalance_Fabric (family `ST_ProgBalance_*`)
15. `program-cancel` | Program Cancel | `/programs/cancel` | DS | M3 | — | pend: `cancel_program` | lf: frmProgCancel, FrmAcc_ProgCancel, frmProgCancel_Compwise
16. `program-complete` | Program Complete | `/programs/complete` | DS | M3 | — | lf: FrmProgramComplete
17. `fabric-acc-allotment` | Fabric / Acc Allotment | `/programs/allotment` | DS | M5 | — | lf: frmFabricAllotment, frmComboWiseReqRpt

**procurement (8)**
18. `purchase-order` | Purchase Order | `/procurement/po` | DS | M3 | `create_purchase_order` | lf: frmPurchaseOrd_MultiOrder, frmPurchaseOrd_MultiOrder_HO, frmPurchaseOrdAcc, frmGeneralPurchaseOrd
19. `po-cancel-complete` | PO Cancel / Complete | `/procurement/po/close` | DS | M3 | `cancel_purchase_order` | lf: FrmPOCancel, frmPoCompl
20. `grn-entry` | GRN Entry | `/procurement/grn` | DS | M3 | `receive_grn` | lf: frmGRNEntry, frmGRNEntry_MultiOrder, frmGRNEntryAcc, frmGRNEntry_Ret_Multi
21. `multi-process-grn` | Multi-Process GRN | `/procurement/grn/multi-process` | DS | M3 | — | lf: frmGRN_MultiProcess, frmPrsGRNMulti, frmPrsGRNMulti_Compwise
22. `grn-acceptance` | GRN Acceptance | `/procurement/grn/acceptance` | IN | M3 | `approve_pending` | lf: FrmPurGrnAccept, FrmProGrnAccept
23. `supplier-orders` | Supplier Orders | `/procurement/supplier-orders` | DS | M5 | — | lf: FrmSuppOrdSheet_Semi, FrmSuppProdSequence, FrmSuppTechDataSheet
24. `rate-confirmation` | Rate Confirmation | `/procurement/rate-confirmation` | RG | M5 | — | lf: RptYarnRateConfirm, RptFabRateConfirm, RptAccRateConfirm
25. `party-balance` | Party Balance | `/procurement/party-balance` | RG | M4 | `get_party_ledger` | lf: FrmPartyBlnc, Sp_POBalnce

**inventory (9)**
26. `stock-view` | Stock View (live) | `/inventory/stock` | RG | M2 | `get_stock` | lf: frmStockView, frmfabstockshow, frmYarnStockShow, frmAccStockShow, frmAccShort
27. `stock-ledger` | Stock Ledger | `/inventory/ledger` | RG | M4 | `get_stock_ledger` | lf: FrmStockLedger, Vue_StkLedger
28. `stock-register` | Stock Register | `/inventory/register` | RH | M4 | — | lf: FrmStockRegister, FrmStockRegister_Style, FrmStockRegister_StylePcs, FrmStockRegister_SplRpt
29. `opening-stock` | Opening Stock | `/inventory/opening-stock` | DS | M2 | — | pend: `post_opening` | lf: frmOpeningStock, frmOpeningStock_CompWise, frmPcsStagewiseOpeningStock
30. `stock-adjustment` | Stock Adjustment | `/inventory/adjustment` | DS | M3 | `adjust_stock` | lf: frmStockAdjustment, frmStockAdjustment_Domestic
31. `godown-transfer` | Godown Transfer + Ack | `/inventory/transfer` | DS | M3 | — | pend: `transfer_stock` | lf: FrmStkTransfer, FrmChangeGodown, FrmGoDownAck, FrmGodownTransferAck
32. `lot-tracking` | Lot Tracking | `/inventory/lots` | RG | M4 | `list_lots` | lf: FrmLotRegister, frmLotWiseDtl, FrmLotSeparate, frmLotApproval
33. `roll-tracking` | Roll Tracking / Split | `/inventory/rolls` | DS | M5 | — | lf: Frm_RollSplit, CurrentStock_RollDtl
34. `io-history` | IO History | `/inventory/io-history` | RG | M4 | — | lf: FrmIoHistoryReg, FrmIoHistoryReg_New

**cutting (10)**
35. `cutting-job-order` | Cutting Job Order | `/cutting/job-order` | DS | M3 | `create_cut_order` | lf: frmCuttingJobOrder
36. `cutting-issue` | Cutting Issue | `/cutting/issue` | DS | M3 | — | pend: `issue_fabric_to_cut` | lf: frmCuttingIssue
37. `ready-to-cut` | Ready to Cut | `/cutting/ready-to-cut` | DS | M3 | — | pend: `ready_to_cut` | lf: frmReadytoCut · notes: legacy virtual dept −7 (legacy-enums.ts in M2)
38. `cutting-production` | Cutting Production | `/cutting/production` | DS | M3 | `post_production_entry` | lf: FrmCuttingProduction_Auto_New
39. `cutting-ack` | Cutting Ack | `/cutting/ack` | IN | M3 | — | lf: frmcuttingack
40. `panel-cutting` | Panel Cutting / Add | `/cutting/panel` | DS | M5 | — | lf: frmAddPanelCutting
41. `panel-production` | Panel Production | `/cutting/panel-production` | DS | M5 | — | lf: frmProduction_CutPanel
42. `panel-rej-rework` | Panel Rej / Rework | `/cutting/panel-rework` | DS | M5 | `post_rejection` | lf: frmPanelRej, frmPanelDelRework
43. `panel-excess` | Panel Excess | `/cutting/panel-excess` | DS | M5 | — | lf: FrmPanelExcessEntry, FrmPanelExcessEntry_Stage
44. `fabric-rejection-return` | Fabric Rejection Return | `/cutting/fab-rejection` | DS | M5 | — | lf: FrmCutting_FabRej, FrmCuttingfabretreg

**pieces (9)**
45. `pcs-dc` | Pcs DC (Despatch) | `/pieces/despatch` | DS | M3 | `create_pcs_despatch` | lf: frmPcsDel, frmPcsDel_Ship, frmPcsDelRework
46. `pcs-receipt` | Pcs Receipt | `/pieces/receipt` | DS | M3 | `receive_jobwork` | lf: frmPcsRec
47. `pcs-grn-acceptance` | Pcs GRN Acceptance (GAN) | `/pieces/gan` | IN | M3 | — | lf: FrmProGrnAccept (pcs variant) · notes: GAN semantics — PITFALLS #12
48. `pcs-transfer` | Pcs Transfer | `/pieces/transfer` | DS | M3 | — | lf: FrmPcsGodTransfer
49. `pcs-rejection` | Pcs Rejection | `/pieces/rejection` | DS | M3 | `post_rejection` | lf: frmPcsRej
50. `pcs-shortage` | Pcs Shortage | `/pieces/shortage` | DS | M5 | — | lf: frmPcsShort, frmShortage, frmShortage_Compwise, FrmShortageBitEntry
51. `pcs-stock` | Pcs Stock | `/pieces/stock` | RG | M4 | `get_stock` | lf: FrmPieceStock, FrmPieceStock_All, FrmRejPieceStock
52. `finished-goods-entry` | Finished Goods Entry | `/pieces/finished-goods` | DS | M5 | — | lf: FrmFinishGoodsEntry
53. `packing-list` | Packing List | `/pieces/packing-list` | DS | M5 | — | lf: FrmPackingList, FrmPackingList_Domestic, FrmLocalInvPackingList, FrmPackingList_Solid

**production (9)**
54. `production-entry` | Production Entry | `/production/entry` | DS | M3 | `post_production_entry` | lf: frmProduction
55. `issue-to-line` | Issue to Line | `/production/issue` | DS | M3 | `issue_to_line` | lf: FrmIssueToProduction, FrmLineInput, FrmLineInput_Manual
56. `line-output` | Line Output | `/production/line-output` | DS | M3 | — | lf: frmLineOutputManual, frmLineOutputManual_New
57. `line-status` | Line Status / WIP | `/production/line-status` | DB | M3 | `get_line_status` | lf: — (legacy EmpID-as-LineID trick)
58. `rework` | Rework | `/production/rework` | DS | M3 | `post_rework` | lf: — (legacy rework flag 0/1/2 semantics)
59. `bundle-barcode` | Bundle / Barcode Entry | `/production/bundles` | DS | M5 | — | pend: `scan_bundle` | lf: FrmBundle_ProductionEntry, frmBarcodeReadingNew
60. `line-transfer` | Line Transfer | `/production/line-transfer` | DS | M5 | — | lf: Trs_LineTfr
61. `operation-entry` | Operation Entry | `/production/operations` | DS | M5 | — | lf: FrmOperationEntry, Frm_SubProcess
62. `production-status-register` | Production Status Register | `/production/register` | RG | M4 | — | lf: FrmProductionStatusReg, FrmInhouseProductionStatusReg

**jobwork (5)**
63. `jobwork-order` | Jobwork Order (out) | `/jobwork/order` | DS | M3 | `create_jobwork_order` | lf: — (legacy JW semantics)
64. `jobwork-receipt` | Jobwork Receipt (in) | `/jobwork/receipt` | DS | M3 | `receive_jobwork` | lf: —
65. `contract-allotment` | Contract Allotment | `/jobwork/contract` | DS | M5 | — | lf: frmContractAllotment, frmContractAllotment_New
66. `job-order-list` | Job Order List / Balance | `/jobwork/register` | RG | M4 | `list_jobworks` | lf: FrmJobOrderList + party/unit-wise balance reports
67. `jobwork-pcs-return` | Jobwork Pcs Return | `/jobwork/pcs-return` | DS | M5 | — | lf: frmJobWorkPcsReturn

**dispatch (8)**
68. `dc-entry` | Fabric/Yarn/Acc/Gen DC | `/dispatch/dc` | DS | M3 | — | pend: `create_dc` | lf: FrmFabDel, FrmAccDel, FrmGenDC, Yarn DC variants
69. `process-dc` | Process DC (multi) | `/dispatch/dc/process` | DS | M3 | — | lf: frmPrsDelMulti, frmPrsDelMulti_Acc, frmPrsDelMulti_Compwise
70. `dc-return` | DC Return | `/dispatch/dc-return` | DS | M3 | — | lf: FrmAccDel_Return, FrmFabDel_Return, RPtFabDcRet
71. `gate-entry` | Gate Entry | `/dispatch/gate-entry` | DS | M5 | — | lf: FrmGateEntry, FrmDirectBill_GateEntry
72. `gate-pass` | Gate Pass | `/dispatch/gate-pass` | DS | M5 | — | lf: FrmGatePass
73. `unit-transfer-ack` | Unit Transfer Ack | `/dispatch/unit-transfer-ack` | IN | M5 | — | lf: FrmUnitTransferAck
74. `courier-dc` | Courier DC | `/dispatch/courier` | DS | M6 | — | lf: CourierDC
75. `loading` | Loading | `/dispatch/loading` | DS | M6 | — | lf: FrmLoading

**accounts (12)**
76. `sales-invoice` | Sales Invoice | `/accounts/invoice` | DS | M3 | `create_sales_invoice` | lf: frmSalINV, frmNewInv
77. `local-invoice` | Local Invoice | `/accounts/invoice/local` | DS | M5 | — | lf: FrmLocalInvoice, FrmLocalInvConfirm
78. `piece-jobwork-invoice` | Piece / Jobwork Invoice | `/accounts/invoice/piece` | DS | M5 | — | lf: frmPieceInv, frmPieceInv_1, Rpt_JobwrkInvoice
79. `debit-note` | Debit Note | `/accounts/debit-note` | DS | M3 | `create_debit_note` | lf: frmdebitnote, frmDirectDebitNote
80. `bill-pass` | Bill Pass | `/accounts/bill-pass` | IN | M5 | — | lf: frmBillPass
81. `bills-register` | Bills Register | `/accounts/bills-register` | RG | M4 | — | lf: FrmBillsReg, FrmBillsAddDedReport + 10 dept variants
82. `supplier-bill-register` | Supplier Bill Register | `/accounts/supplier-bills` | RG | M4 | — | lf: FrmSupplierBillReg
83. `payments-receipts` | Payments & Receipts | `/accounts/payments` | DS | M3 | `record_payment` | lf: FrmPaymentReg
84. `party-ledger` | Party Ledger | `/accounts/party-ledger` | RG | M4 | `get_party_ledger` | lf: FrmPartyBalanceRegister
85. `journal` | Journal | `/accounts/journal` | DS | M3 | `create_journal` | lf: —
86. `production-bills` | Production Bills (piece-rate) | `/accounts/production-bills` | DS | M5 | — | lf: FrmProdBillNew
87. `hsn-gst-setup` | HSN / GST Setup | `/accounts/hsn-gst` | ST | M2 | — | lf: FrmHSN, FrmHSNPce, FrmTally_GSTSetup

**costing (7)**
88. `cost-sheet` | Cost Sheet | `/costing/cost-sheet` | DS | M3 | `create_cost_sheet` | lf: —
89. `costing-input` | Costing Input | `/costing/input` | DS | M5 | — | lf: Frm_CostingInput + multi-level daily variants
90. `budget` | Budget | `/costing/budget` | DS | M5 | — | pend: `create_budget` | lf: frmBudget, frmBudgetNew_JobWork, frmPreBudgetProdPlan
91. `budget-vs-actual` | Budget vs Actual | `/costing/budget-vs-actual` | RG | M4 | `get_budget_vs_actual` | lf: FrmBudgetAndActualComp
92. `expenses` | Expenses | `/costing/expenses` | DS | M5 | — | lf: FrmExpenses, FrmFixedExpensesEntry, FrmStylewiseExpensesEntry
93. `daily-unit-pnl` | Daily Unit P&L | `/costing/daily-pnl` | RH | M6 | — | lf: Sp_DailyUnitPANDL
94. `piece-rate-confirmation` | Piece-Rate Confirmation | `/costing/piece-rate` | RH | M5 | — | lf: RptPieceRateConfirm, RptPieceRateConfirm_InHouse

**hr (4)**
95. `employees` | Employees & Contractors | `/hr/employees` | MT | M2 | `create_employee` | lf: FrmEmpmaster
96. `shifts-hours` | Shifts & Hours | `/hr/shifts` | MT | M5 | — | lf: frmHours, FrmHourlySetting1
97. `production-wages` | Production Wages | `/hr/wages` | DS | M5 | — | lf: Frm_ProductionWages, Frm_ProductionWages_Dept, Frm_ProductionWages_Stage
98. `wage-payments` | Wage Payments | `/hr/wage-payments` | DS | M5 | — | lf: FrmPaymentReg_Wages

**quality (5)**
99. `lab-test-entry` | Lab Test Entry | `/quality/lab-tests` | DS | M5 | — | lf: FrmLabTest, FrmNewLabTest
100. `test-parameters` | Test Parameters / Stages | `/quality/parameters` | MT | M2 | — | lf: FrmLabTestParameters, FrmLabTestParameters_Stages, FrmLabTestParameters_InputParameters
101. `lot-approval` | Lot Approval | `/quality/lot-approval` | IN | M3 | — | lf: frmLotApproval
102. `reprocess-approval` | Reprocess Approval | `/quality/reprocess-approval` | IN | M5 | — | lf: FrmReprocess_Approval
103. `non-return-dc-approval` | Non-Return DC Approval | `/quality/non-return-dc` | IN | M5 | — | lf: FrmNonReturnDCApproval

**approvals (2)**
104. `approval-inbox` | Approval Inbox | `/approvals` | IN | M1 | `get_pending_approvals` | lf: all 18 approval forms (expand from form-taxonomy.json: approval archetype)
105. `approval-audit-trail` | Approval Audit Trail | `/approvals/audit` | RG | M4 | — | lf: AgentTurn log (modern source; no legacy form)

**reports (3)**
106. `report-hub` | Report Hub | `/reports` | RH | M6 | — | pend: `render_report` | lf: ~491 report files → ~80 unique (dedup evidence §1.2)
107. `report-packs` | Order / Production / Inventory / Accounts packs | `/reports/packs` | RH | M6 | — | lf: domain .rpt/.mrt sets
108. `mis-dashboard` | MIS Dashboard | `/reports/mis` | DB | M6 | — | lf: frmMIS, FrmMISSetting

**masters-admin (5)**
109. `masters` | All Masters (~40 entities) | `/masters` | MT | M2 | 21 create_* tools (party, buyer, style, fabric, yarn, accessory, godown, department, employee, colour, size, uom, dia, lot, season, merchandiser, exporter, fin_year, line, size_group, bom) | lf: 52 master forms (expand from form-taxonomy.json: master archetype)
110. `users-groups` | Users & Groups | `/admin/users` | ST | M6 | — | lf: FrmMasuser, FrmUserGroupMas
111. `menu-rights` | Menu Rights | `/admin/menu-rights` | ST | M6 | — | lf: FrmMenuRights, FrmMenuAccRights
112. `company-finyear` | Company / FinYear | `/admin/company` | ST | M2 | `create_fin_year` | lf: FrmCompanyLogin, FrmCompanyRights, FrmFinyearLogin · notes: admin half lands M6; single-company until then (open decision #1)
113. `options-settings` | Options & Settings | `/admin/options` | ST | M6 | — | lf: frmOptions, FrmOptionsPrint, frmDeptSettings

**Item count check: 3+9+5+8+9+10+9+9+5+8+12+7+4+5+2+3+5 = 113.**

## 6. File map (every file M1 creates/modifies)

### NEW files

| File | Kind | Contract |
|---|---|---|
| `src/lib/erp/menu-registry.ts` | pure data + helpers | §3 types, §5 data, §4 LIVE_ROUTES. ZERO imports from app code (only types). Importable from server & client & tests. |
| `src/app/(erp)/layout.tsx` | server | Wraps ALL routed pages: renders `AppShell` (client) with children. NO data fetching. |
| `src/app/(erp)/page.tsx` | server | Dashboard. Re-homes `Dashboard` view. DELETE old `src/app/page.tsx` in the same commit (route conflict). |
| `src/app/(erp)/orders/page.tsx` | server | `<OrdersView/>` wrapper |
| `src/app/(erp)/procurement/page.tsx` | server | `<ProcurementView/>` |
| `src/app/(erp)/inventory/page.tsx` | server | `<InventoryView/>` |
| `src/app/(erp)/cutting/page.tsx` | server | `<CuttingView/>` |
| `src/app/(erp)/production/page.tsx` | server | `<ProductionView/>` |
| `src/app/(erp)/accounts/page.tsx` | server | `<InvoicesView/>` |
| `src/app/(erp)/costing/page.tsx` | server | `<CostingView/>` |
| `src/app/(erp)/hr/page.tsx` | server | `<HrView/>` |
| `src/app/(erp)/masters/page.tsx` | server | `<MastersView/>` |
| `src/app/(erp)/approvals/page.tsx` | server | `<WorkflowView/>` — this IS the Approval Inbox shell (tool-backed: `get_pending_approvals` + `/api/agent/approve`) |
| `src/app/(erp)/coming/[id]/page.tsx` | server | Registry-driven. `findItemById(id) ?? findGroupById(id)`; if neither → `notFound()`. Renders `ComingSoon` component. |
| `src/app/(erp)/parity/page.tsx` | server | Per-group table from `parityStats()` + `MENU_ITEMS`: item, arch, phase, live dot, legacy count, tools. |
| `src/components/erp/app-shell.tsx` | client | Owns sidebar-open state (mobile Sheet), Cmd+K handler, renders NavSidebar + Topbar + children + ParityFooter + `AgentPanelProvider`+`AgentPanel`. |
| `src/components/erp/nav-sidebar.tsx` | client | Registry-driven. 17 group rows (icon, label, live/coming badge, counts). Active group expands (accordion) to show its items with live/coming dots. Links via `getHref`/`groupLandingHref`. Icon map: string name → lucide component. |
| `src/components/erp/topbar.tsx` | client | Mobile menu button, breadcrumbs (`findGroupByLanding(pathname)` › `findItemByRoute(pathname)`), Agent button (opens provider), seed/refresh actions preserved from old page.tsx. |
| `src/components/erp/parity-footer.tsx` | shared | One-line strip: `113 menu items · 3 live · 110 coming · legacy coverage 21.8%` + link to `/parity`. Numbers from `parityStats()`. |
| `src/components/erp/coming-soon.tsx` | server + client button | Card: title, description, phase badge, archetype badge, "Available NOW via agent" (tool chips + Ask button, only if `agentTools.length > 0`), legacy forms covered (collapsible `<details>`), future route (mono), link to `/parity`. |
| `src/components/agent/agent-panel-provider.tsx` | client | Context: `openAgent(seed?: string)`, `closeAgent()`. Renders `AgentPanel` with `seedPrompt` state. Mount ONCE in AppShell. |
| `tests/unit/menu-registry.test.ts` | vitest | §10 assertions. |

### MODIFIED files

| File | Change |
|---|---|
| `src/components/agent/agent-panel.tsx` | Add optional `seedPrompt?: string` prop: when the panel opens with a seed, set it as the input value (do NOT auto-send). Clear on close. |
| `src/components/erp/dashboard.tsx` | `onNavigate` prop: keep signature, but callers now pass a router-pushing callback (see §9). If Dashboard calls `onNavigate('procurement')`, the wrapper maps it to `/procurement`. |
| `docs/CONTEXT/01-STATE.md` + `worklog.md` | Updated in the SAME commit as M1 code (rule #5). |

### DELETED files

| File | Reason |
|---|---|
| `src/app/page.tsx` | Replaced by `src/app/(erp)/page.tsx` (route conflict if both exist). |
| `src/components/erp/sidebar.tsx` | Replaced by registry-driven `nav-sidebar.tsx`. Verify no other importer first. |

### UNCHANGED (do not touch)

`src/lib/agent/*`, `src/app/api/*`, `prisma/*`, the 11 view components' internals,
`tests/pipeline/industry-chain.test.ts`.

## 7. Component contracts

**AppShell (client)** — the only stateful shell:
```
state: sidebarOpen (mobile Sheet), agentSeed (string | undefined)
- Cmd+K / Ctrl+K → openAgent()
- renders: NavSidebar (desktop <aside> + mobile Sheet), Topbar, <main>{children}</main>,
  ParityFooter, AgentPanelProvider(AgentPanel)
```

**NavSidebar** — visual language = existing dark sidebar (`bg-slate-900 text-slate-100`,
emerald accent). Group row: icon + label + `live/total` mini-badge (e.g. `1/9`).
Active group = pathname matches group landing or any item route prefix → expanded.
Item row: dot (emerald=live, slate-600=coming) + label; title tooltip = description.
Sidebar bottom: parity summary + seed button (re-homed from old sidebar).

**Topbar** — breadcrumbs: group label (link to landing) › item label (if matched).
Right side: Agent button (emerald gradient, `⌘K` hint) — opens `openAgent()`.

**ComingSoon** — P3 "no dead ends": every coming page must (a) explain what will live
here, (b) offer the agent door when tools exist. Ask button calls
`openAgent(item.agentPrompt ?? fallback)` via a small client wrapper component
(`AskAgentButton`) since the page itself is a server component.

**ParityFooter** — sticky bottom strip, `text-xs`, slate; hidden on print.

## 8. Agent prompt seeds (agentPrompt values for tool-backed items)

| itemId | agentPrompt |
|---|---|
| `dashboard` | (live — n/a) |
| `order-status-board` | `Show me the current order status and what to do next` |
| `order-sheet-new` | `I want to create a new sales order` |
| `order-hub` | `Show me the full production track for an order` |
| `order-enquiry` | `Search my orders` |
| `order-register` | `List all orders` |
| `order-amendments` | `I want to amend an existing order` |
| `program-entry` | `I want to create a program for an order` |
| `program-status` | `Show me program balances and pending requirements` |
| `purchase-order` | `I want to create a purchase order` |
| `po-cancel-complete` | `I want to cancel a purchase order` |
| `grn-entry` | `I want to record a GRN (goods receipt)` |
| `grn-acceptance` | `Show me pending approvals` |
| `party-balance` | `Show me party balances and pending POs` |
| `stock-view` | `Show me current stock` |
| `stock-ledger` | `Show me the stock ledger` |
| `stock-adjustment` | `I want to adjust stock` |
| `lot-tracking` | `List lots` |
| `cutting-job-order` | `I want to create a cutting job order` |
| `cutting-production` | `I want to post cutting production` |
| `panel-rej-rework` | `I want to post a panel rejection` |
| `pcs-dc` | `I want to despatch finished pieces (Pcs DC)` |
| `pcs-receipt` | `I want to receive pieces back from jobwork` |
| `pcs-rejection` | `I want to post a pieces rejection` |
| `pcs-stock` | `Show me finished goods (pcs) stock` |
| `production-entry` | `I want to post a production entry` |
| `issue-to-line` | `I want to issue pieces to a production line` |
| `line-status` | `Show me line status and WIP` |
| `rework` | `I want to post a rework entry` |
| `jobwork-order` | `I want to create a jobwork order` |
| `jobwork-receipt` | `I want to receive jobwork back` |
| `job-order-list` | `List jobwork orders and balances` |
| `sales-invoice` | `I want to create a sales invoice` |
| `debit-note` | `I want to raise a debit note` |
| `payments-receipts` | `I want to record a payment or receipt` |
| `party-ledger` | `Show me a party's ledger` |
| `journal` | `I want to pass a journal entry` |
| `cost-sheet` | `I want to create a cost sheet` |
| `budget-vs-actual` | `Show me budget vs actual` |
| `employees` | `I want to add an employee` |
| `approval-inbox` | (live — n/a) |
| `masters` | (live — n/a) |
| `company-finyear` | `I want to create a financial year` |

## 9. View re-homing map (ViewKey → route)

Old `page.tsx` ViewKey → new route (used by Dashboard's `onNavigate` wrapper):

```
dashboard → /   orders → /orders   procurement → /procurement   inventory → /inventory
cutting → /cutting   production → /production   invoices → /accounts   costing → /costing
hr → /hr   workflow → /approvals   masters → /masters
```

Each route page is a thin client wrapper: `'use client'` + `useRouter` + refresh state
(key-based remount like the old page.tsx) around the unchanged view component.
`/` (dashboard) passes `onNavigate={(v) => router.push(VIEW_ROUTE[v])}`.

## 10. Tests (`tests/unit/menu-registry.test.ts`)

```ts
1. MENU_ITEMS.length === 113
2. MENU_GROUPS.length === 17
3. all item ids unique; all ids kebab-case /^[a-z0-9-]+$/
4. every item.groupId resolves to a group
5. every item.route starts with '/' ; routes unique EXCEPT documented shared routes (none expected)
6. every group has ≥1 item
7. LIVE_ROUTES routes all start with '/' and '/coming' is a PREFIX entry, not an item route
8. getHref(liveItem) === item.route ; getHref(comingItem) === `/coming/${item.id}`
9. isLive('dashboard' item) === true; isLive('grn-entry' item) === false
10. parityStats().liveItems === 3 && totalItems === 113
11. every LIVE route except '/coming' prefix has a matching page file on disk (fs check against src/app/(erp)/)
12. items with agentTools all have agentPrompt or are live
```

Route smoke (manual, dev server): `curl -s -o /dev/null -w '%{http_code}' localhost:3000<route>`
for every LIVE_ROUTES entry + 3 sample `/coming/<id>` pages (item + group + 404 case).

## 11. Implementation order (one session)

1. `menu-registry.ts` (pure data — write from §5, no app imports)
2. `tests/unit/menu-registry.test.ts` → `npx vitest run tests/unit` green
3. `agent-panel.tsx` seedPrompt prop + `agent-panel-provider.tsx`
4. `nav-sidebar.tsx` + `topbar.tsx` + `parity-footer.tsx` + `app-shell.tsx` + `(erp)/layout.tsx`
5. Re-home the 12 view route pages; delete old `page.tsx` + `sidebar.tsx`; smoke `/`
6. `coming/[id]/page.tsx` + `coming-soon.tsx` + AskAgentButton; smoke item + group + 404
7. `parity/page.tsx`; smoke
8. Full acceptance run: tsc, vitest (15+12), route smoke all LIVE_ROUTES
9. Update 01-STATE.md (M1 DONE, new metrics: routes count, registry counts) + worklog entry
10. `git add -A && git commit -m "m1: app shell + menu registry — 113 items, 12 live routes, parity tracker"` + `git tag m1-done`

## 12. Edge cases & gotchas

- Route group `(erp)` adds NO URL segment — `/orders` not `/(erp)/orders`.
- Deleting `src/app/page.tsx` and adding `src/app/(erp)/page.tsx` in the SAME commit avoids build conflicts.
- `/coming/[id]` params are async in Next 16 (`await params`) — type accordingly.
- `menu-registry.ts` must NOT import lucide-react (keeps it test-importable without React
  tree); icons are string names mapped in `nav-sidebar.tsx`.
- The old `Sidebar` component may be imported elsewhere (grep first before deleting).
- Dev server must be restarted after route-group restructuring.
- `parityStats()` coverage % will be ≈21–22% in M1 (70 of 321 legacy forms live: 52 masters
  + 18 approvals). Do NOT hand-tune the number — it derives from legacyForms arrays.

