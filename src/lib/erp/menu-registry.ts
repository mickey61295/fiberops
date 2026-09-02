/**
 * MENU REGISTRY — the single source of navigation truth for FiberOps 2.0.
 *
 * Spec: docs/CONTEXT/specs/SPEC-M1.md (frozen — transcribe, do not re-derive).
 * Strategy: docs/PLAN-2.0-MENU-PARITY.md §3 (menu tree) + §4.6 (wiring layer).
 * Evidence: docs/form-taxonomy.json (321 legacy WinForms classified).
 *
 * Rules (SPEC-M1 §3):
 *  - item.route NEVER changes after M1 (deep links / nextFormUrl / breadcrumbs use it).
 *  - item.phase is frozen from the plan; changing it requires a plan edit + ADR.
 *  - LIVE_ROUTES is the ONLY place liveness is declared. It grows per milestone.
 *  - This file must stay importable from server, client AND vitest without app deps.
 */

import { countableLegacyForms } from './legacy-aliases'

export type Archetype = 'DB' | 'MT' | 'DS' | 'RG' | 'IN' | 'RH' | 'ST' | 'LT'
export type Phase = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M9' | 'M11' | 'M13' | 'M15' | 'M19' | 'M20' | 'M21' | 'M38' | 'M39' | 'M40' | 'M41' | 'M42' | 'M43'

export interface MenuGroup {
  id: string
  label: string
  icon: string // lucide-react icon NAME; component map lives in nav-sidebar.tsx
  landingRoute: string // live route OR '/coming/<groupId>' when group has no screen yet
  order: number
  description: string
}

export interface MenuItem {
  id: string
  label: string
  description: string
  groupId: string
  route: string // canonical FUTURE route; may not exist yet
  arch: Archetype
  phase: Phase
  legacyForms: string[]
  agentTools: string[]
  pendingTools: string[]
  agentPrompt?: string
  notes?: string
}

// ---------------------------------------------------------------------------
// LIVE_ROUTES — what renders today (M1 set). Grows each milestone.
// ---------------------------------------------------------------------------
export const LIVE_ROUTES = new Set<string>([
  '/', // Dashboard
  '/orders', // OrdersView
  '/orders/new', // Order Sheet New mode (M3 Wave B) — order-sheet-new
  '/orders/[id]', // Order Hub (M3 Wave B, W3) — order-hub
  '/programs/new', // Program Entry (M3 Wave C) — program-entry
  '/programs/propose', // Propose from BOM (M43 PRG-05) — program-propose (IN custom)
  '/programs/[id]', // Program view (M3 Wave C)
  '/procurement', // ProcurementView
  '/procurement/po', // Purchase Order (M3 Wave C) — purchase-order
  '/procurement/po/[id]', // PO view (M3 Wave C)
  '/procurement/grn', // GRN Entry (M3 Wave C) — grn-entry
  '/procurement/grn/[id]', // GRN view (M3 Wave C)
  '/jobwork/order', // Jobwork DC out (M3 Wave C) — jobwork-order
  '/jobwork/order/[id]', // Jobwork DC view (M3 Wave C; also the receipt target)
  '/jobwork/receipt', // Jobwork Receipt in (M3 Wave C) — jobwork-receipt (update-only, no own view)
  '/cutting', // CuttingView
  '/cutting/job-order', // Cutting Job Order (M3 Wave C) — cutting-job-order
  '/cutting/job-order/[id]', // Cut Order view (M3 Wave C)
  '/production', // ProductionView
  '/production/issue', // Issue to Line (M3 Wave C) — issue-to-line
  '/production/issue/[id]', // Line Issue view (M3 Wave C)
  '/production/entry', // Production Entry (M3 Wave C) — production-entry
  '/production/entry/[id]', // Production Entry view (M3 Wave C; also serves rework rows)
  '/production/rework', // Rework (M3 Wave C) — rework (view via /production/entry/[id])
  '/pieces/rejection', // Pcs Rejection (M3 Wave C) — pcs-rejection
  '/pieces/rejection/[id]', // Rejection view (M3 Wave C)
  '/pieces/despatch', // Pcs DC Despatch (M3 Wave C) — pcs-dc
  '/pieces/despatch/[id]', // Despatch DC view (M3 Wave C)
  '/accounts/invoice', // Sales Invoice (M3 Wave D) — sales-invoice
  '/accounts/invoice/[id]', // Invoice view (M3 Wave D)
  '/accounts/debit-note', // Debit Note (M3 Wave D) — debit-note
  '/accounts/debit-note/[id]', // Debit Note view (M3 Wave D)
  '/accounts/payments', // Payments & Receipts (M3 Wave D) — payments-receipts
  '/accounts/payments/[id]', // Payment view (M3 Wave D)
  '/accounts/journal', // Journal (M3 Wave D) — journal
  '/accounts/journal/[id]', // Journal voucher view (M3 Wave D)
  '/costing/cost-sheet', // Cost Sheet (M3 Wave D) — cost-sheet
  '/costing/cost-sheet/[id]', // Cost Sheet view (M3 Wave D)
  '/inventory/adjustment', // Stock Adjustment (M3 Wave D) — stock-adjustment (ledger rows are the record; no [id] view)
  '/inventory/transfer', // Godown Transfer + Ack (M3 Wave D) — godown-transfer (ledger pair is the record; no [id] view)
  '/inventory', // InventoryView
  '/registers/daily-in-out', // Daily In/Out register (M4 Wave A) — daily-in-out
  '/orders/register', // Order Register (M4 Wave A) — order-register
  '/inventory/ledger', // Stock Ledger register (M4 Wave A) — stock-ledger
  '/orders/in-hand', // In-Hand Orders (M4 Wave B) — inhand-orders
  '/procurement/party-balance', // Party Balance (M4 Wave B) — party-balance
  '/inventory/register', // Stock Register (M4 Wave B) — stock-register
  '/inventory/lots', // Lot Tracking (M4 Wave B) — lot-tracking
  '/inventory/io-history', // IO History (M4 Wave B) — io-history
  '/pieces/stock', // Pcs Stock (M4 Wave B) — pcs-stock
  '/production/register', // Production Status Register (M4 Wave B) — production-status-register
  '/jobwork/register', // Job Order List / Balance (M4 Wave B) — job-order-list
  '/jobwork/statement', // Jobworker Material Statement (M39 JWL-07) — jobworker-statement
  '/accounts/bills-register', // Bills Register (M4 Wave B) — bills-register
  '/accounts/supplier-bills', // Supplier Bill Register (M4 Wave B) — supplier-bill-register
  '/accounts/party-ledger', // Party Ledger (M4 Wave B) — party-ledger
  '/costing/budget-vs-actual', // Budget vs Actual (M4 Wave B) — budget-vs-actual
  '/approvals/audit', // Approval Audit Trail (M4 Wave B) — approval-audit-trail
  '/orders/status', // Order Status Board (M4 Wave C) — order-status-board
  // M5 Wave A (SPEC-M5 §7-A)
  '/costing/budget', // Budget (M5 Wave A) — budget
  '/costing/budget/[id]', // Budget view (M5 Wave A) — budget
  '/orders/commercial-invoice', // Commercial Invoice (M5 Wave A) — commercial-invoice
  '/accounts/invoice/local', // Local Invoice (M5 Wave A) — local-invoice
  '/accounts/invoice/piece', // Piece / Jobwork Invoice (M5 Wave A) — piece-jobwork-invoice
  '/procurement/supplier-orders', // Supplier Orders (M5 Wave A) — supplier-orders
  '/procurement/rate-confirmation', // Rate Confirmation (M5 Wave A) — rate-confirmation
  '/costing/piece-rate', // Piece-Rate Confirmation (M5 Wave A) — piece-rate-confirmation
  // M5 Wave B (SPEC-M5 §7-B)
  '/pieces/finished-goods', // Finished Goods Entry (M5 Wave B) — finished-goods-entry (variant of /production/entry)
  '/production/operations', // Operation Entry (M5 Wave B) — operation-entry (variant of /production/entry)
  '/production/bundles', // Bundle / Barcode Entry (M5 Wave B) — bundle-barcode (variant of /production/entry)
  '/production/line-transfer', // Line Transfer (M5 Wave B) — line-transfer (pair of LineIssue rows)
  '/cutting/panel', // Panel Cutting / Add (M5 Wave B) — panel-cutting (variant of /cutting/job-order)
  '/cutting/panel-production', // Panel Production (M5 Wave B) — panel-production (variant of /production/entry)
  '/cutting/panel-excess', // Panel Excess (M5 Wave B) — panel-excess (variant of /production/entry)
  '/cutting/panel-rework', // Panel Rej / Rework (M5 Wave B) — panel-rej-rework (variant of /pieces/rejection)
  '/cutting/fab-rejection', // Fabric Rejection Return (M5 Wave B) — fabric-rejection-return (variant of /pieces/rejection)
  '/pieces/shortage', // Pcs Shortage (M5 Wave B) — pcs-shortage (variant of /pieces/rejection)
  '/jobwork/pcs-return', // Jobwork Pcs Return (M5 Wave B) — jobwork-pcs-return (process_return GRN)
  '/costing/input', // Costing Input (M5 Wave B) — costing-input (variant of /costing/cost-sheet)
  '/hr/wages', // Production Wages (M5 Wave B) — production-wages (RG + wage-bill journal)
  '/hr/wage-payments', // Wage Payments (M5 Wave B) — wage-payments (variant of /accounts/payments)
  // M5 Wave C (SPEC-M5 §6 — approval gates; kind-filtered inbox views)
  '/accounts/bill-pass', // Bill Pass (M5 Wave C) — bill-pass (IN, kind=supplier_bill)
  '/dispatch/unit-transfer-ack', // Unit Transfer Ack (M5 Wave C) — unit-transfer-ack (IN, kind=godown_transfer)
  '/quality/reprocess-approval', // Reprocess Approval (M5 Wave C) — reprocess-approval (IN, kind=reprocess)
  '/quality/non-return-dc', // Non-Return DC Approval (M5 Wave C) — non-return-dc-approval (IN, kind=non_return_dc)
  // SPEC-M40 (Phase-6B Batch 4, PAY) — money integrity
  '/accounts/bill', // Supplier Bill (M40 PAY-03) — supplier-bill (DS, SB-####)
  '/accounts/bill/[id]', // Supplier Bill view (M40 PAY-03)
  // M5 Wave D (SPEC-M5 §7-D — ADR-015 new models + write doors)
  '/orders/samples', // Samples & Enquiry (M5 Wave D) — samples-enquiry (Sample model)
  '/orders/samples/[id]', // Sample view (M5 Wave D)
  '/dispatch/gate-entry', // Gate Entry (M5 Wave D) — gate-entry (GateEntry, gateType in)
  '/dispatch/gate-entry/[id]', // Gate Entry view (M5 Wave D)
  '/dispatch/gate-pass', // Gate Pass (M5 Wave D) — gate-pass (GateEntry, gateType out)
  '/dispatch/gate-pass/[id]', // Gate Pass view (M5 Wave D)
  '/pieces/packing-list', // Packing List (M5 Wave D) — packing-list (PackingList+Line)
  '/pieces/packing-list/[id]', // Packing List view (M5 Wave D, W6 despatch recon)
  '/quality/lab-tests', // Lab Test Entry (M5 Wave D) — lab-test-entry (LabTest)
  '/quality/lab-tests/[id]', // Lab Test view (M5 Wave D)
  '/costing/expenses', // Expenses (M5 Wave D) — expenses (Expense)
  '/costing/expenses/[id]', // Expense view (M5 Wave D)
  '/inventory/rolls', // Roll Tracking / Split (M5 Wave D) — roll-tracking (RSP ledger pair is the record)
  '/jobwork/contract', // Contract Allotment (M5 Wave D) — contract-allotment (JobworkOrder status=allotted)
  '/programs/allotment', // Fabric / Acc Allotment (M5 Wave D) — fabric-acc-allotment (ProgBalance write door)
  '/accounts/production-bills', // Production Bills (M5 Wave D) — production-bills (Journal wage bill)
  '/hr/shifts', // Shifts & Hours (M5 Wave D) — shifts-hours (Shift master, MT engine)
  '/accounts', // InvoicesView
  '/costing', // CostingView
  '/hr', // HrView
  '/masters', // MasterTable hub (M2) — 24 config-driven entity screens
  '/admin/company', // Company / FinYear (M2) — company-finyear menu item
  '/approvals', // WorkflowView — Approval Inbox shell
  '/parity', // parity tracker page
  '/live', // live tracker SSE page (M14 — ported from the parked m9-wave-a-alt accelerator)
  '/coming', // prefix for dynamic coming-soon pages
  '/reports', // Report Hub (M6 Wave A) — report-hub (28-report registry)
  '/reports/packs', // Report Packs (M6 Wave A) — report-packs (6 domain packs)
  '/reports/mis', // MIS Dashboard (M6 Wave A) — mis-dashboard (DB over report services)
  '/reports/[slug]', // Report runner (M6 Wave A) — dynamic slug over REPORT_SERVICES
  '/costing/daily-pnl', // Daily Unit P&L (M6 Wave A) — daily-unit-pnl (ReportScreen)
  '/dispatch/courier', // Courier DC (M6 Wave B) — courier-dc (despatch variant mode=courier)
  '/dispatch/loading', // Loading (M6 Wave B) — loading (despatch variant mode=loading, LAD-####)
  '/admin/users', // Users & Groups (M6 Wave B) — users-groups (two MasterTables ?tab=)
  '/admin/menu-rights', // Menu Rights (M6 Wave B) — menu-rights (rights matrix)
  '/admin/options', // Options & Settings (M6 Wave B) — options-settings (AppOption master)
  '/admin/settings', // Feature Flags (M11) — feature-flags (LLD-07 registry board over setFlag)
  '/orders/enquiry', // Order Enquiry (M6 Wave C) — order-enquiry (ALIAS of order-register)
  '/programs/status', // Program Status (M6 Wave C) — program-status (RG)
  '/inventory/stock', // Current Stock (M6 Wave C) — stock-view (RG)
  '/production/line-status', // Line Status (M6 Wave C) — line-status (WIP board)
  '/orders/amendments', // Order Amendments (M6 Wave C) — order-amendments (planOrderAmend)
  '/orders/close', // Order Close (M6 Wave C) — order-close (planCloseOrder)
  '/programs/cancel', // Program Cancel (M6 Wave C) — program-cancel (planCancelProgram)
  '/programs/complete', // Program Complete (M6 Wave C) — program-complete (planCompleteProgram)
  '/procurement/po/close', // PO Cancel/Complete (M6 Wave C) — po-cancel-complete (planPoLifecycle)
  // M6 Wave D (SPEC-M6 §7-D — process tail: 18 items → 113/113)
  '/procurement/grn/multi-process', // Multi-Process GRN (M6 Wave D) — multi-process-grn (MP-#### variant)
  '/procurement/grn/acceptance', // GRN Acceptance (M6 Wave D) — grn-acceptance (kind grn_acceptance)
  '/inventory/opening-stock', // Opening Stock (M6 Wave D) — opening-stock (OPN-#### variant)
  '/cutting/issue', // Cutting Issue (M6 Wave D) — cutting-issue (line-issue variant, dept D3)
  '/cutting/ready-to-cut', // Ready to Cut (M6 Wave D) — ready-to-cut (RTC-#### virtual cutting pool)
  '/cutting/production', // Cutting Production (M6 Wave D) — cutting-production (D3 variant)
  '/cutting/ack', // Cutting Ack (M6 Wave D) — cutting-ack (kind cutting_ack)
  '/pieces/receipt', // Pcs Receipt (M6 Wave D) — pcs-receipt (ALIAS of /jobwork/receipt)
  '/pieces/gan', // Pcs GAN (M6 Wave D) — pcs-grn-acceptance (kind pcs_acceptance)
  '/pieces/transfer', // Pcs Transfer (M6 Wave D) — pcs-transfer (PT-#### variant)
  '/production/line-output', // Line Output (M6 Wave D) — line-output (manual tally variant)
  '/dispatch/dc', // Material DC (M6 Wave D) — dc-entry (MDC-#### variant)
  '/dispatch/dc/process', // Process DC (M6 Wave D) — process-dc (PDC-#### variant)
  '/dispatch/dc-return', // DC Return (M6 Wave D) — dc-return (RTN-#### variant)
  '/quality/lot-approval', // Lot Approval (M6 Wave D) — lot-approval (kind lot)
  '/accounts/hsn-gst', // HSN / GST Setup (M6 Wave D) — hsn-gst-setup (Hsn MasterTable)
  '/hr/employees', // Employees & Contractors (M6 Wave D) — employees (ALIAS of /masters/employee)
  '/quality/parameters', // Test Parameters (M6 Wave D) — test-parameters (TestParameter MasterTable)
  // M9 Wave A (SPEC-M9) — the live operations tracker
  '/tracker', // Live Tracker (M9 Wave A) — live-tracker (polling activity feed, home group)
  // M19 Wave A (SPEC-M19) — material-wise stock day-books + orderwise pcs
  '/inventory/stock/yarn', // Yarn Stock Register (M19) — yarn-stock (RG, preset itemType=yarn)
  '/inventory/stock/fabric', // Fabric Stock Register (M19) — fabric-stock (RG, preset fabric)
  '/inventory/stock/accessory', // Accessory Stock Register (M19) — acc-stock (RG, preset accessory)
  '/inventory/stock/general', // General Stock Register (M19) — general-stock (RG, all materials)
  '/inventory/stock/itemwise', // Itemwise Stock Register (M19) — itemwise-stock (RG, per-item movement summary)
  '/pieces/orderwise', // Orderwise Pcs Register (M19) — orderwise-pcs (RG, pcs stock grouped by order)
  // M19 Wave B (SPEC-M19 §2) — cutting/issue day-books + supplier registers
  '/cutting/register', // Cutting Register (M19-B) — cutting-register (RG, FrmCutingReg)
  '/production/issue/register', // Issue to Line Register (M19-B) — line-issue-register (RG, FrmOrdBundIssToLineReg)
  '/procurement/supplier-pending', // Supplier Pending Orders (M19-B) — supplier-pending (RG, frmSupordPendReg)
  '/procurement/po/register', // PO Register (M19-B) — po-register (RG, FrmSupplierOrderRegister)
  '/procurement/supplier-history', // Supplier Order History (M19-B) — supplier-history (RG, FrmSuppOrderHistoryReg)
  // M19 Wave D (SPEC-M19 §4) — closing-stock as-of + Tally JSON
  '/inventory/closing-stock', // Closing Stock as-of (M19-D) — closing-stock (RG, cumulative period-end statement)
  '/accounts/tally-export', // Tally Export (M19-D) — tally-export (RG, JSON adapter + preview screen)
  // M13 (SPEC-M9 §9) — notifications digest
  '/notifications/digest', // Daily Digest (M13) — daily-digest (approvals + low stock + gate, webhook channels)
  // M15 (SPEC-M9 §9) — engine-level audit trail
  '/admin/audit', // Audit Log (M15) — audit-log (admin viewer over the runCommit trail)
  // M20 (gap-audit P3, Gap D) — attendance
  '/hr/attendance', // Attendance (M20) — attendance (day-book; posted via post_attendance agent tool)
  // M21 (gap-audit P3) — waste receipt
  '/inventory/waste-receipt', // Waste Receipt (M21) — waste-receipt (WST-#### stock-adj variant, FrmWasteReceiptEntry)
  // SPEC-M42 (Phase-6B Batch 6, INV) — stock take & valuation unification
  '/inventory/stock-take', // Stock Take (M42 INV-01) — stock-take list + create (ST-#### cycle)
  '/inventory/stock-take/[id]', // Stock Take view (M42 INV-01) — count grid + advance + count-sheet print
  '/inventory/waste-percent', // Waste % Register (M42 INV-05) — waste-percent (WST- kgs ÷ receipts kgs KPI)
  // SPEC-M41 (Phase-6B Batch 5, PRC) — procurement & dispatch closure
  '/dispatch/register', // Despatch Register (M41 PRC-05) — despatch-register (RG day-book + aging + gate-pass join)
  '/procurement/po/amendments', // PO Amendments (M41 PRC-02) — po-amendments (planPoAmend form door)
  '/procurement/purchase-return', // Purchase Return (M41 PRC-03) — purchase-return (PRN-#### doc screen)
])

// ---------------------------------------------------------------------------
// GROUPS (17) — SPEC-M1 §5.1
// ---------------------------------------------------------------------------
export const MENU_GROUPS: MenuGroup[] = [
  { id: 'home', label: 'Home', icon: 'LayoutDashboard', landingRoute: '/', order: 1, description: 'KPIs, order status board, daily in/out' },
  { id: 'orders', label: 'Orders & Sales', icon: 'ClipboardList', landingRoute: '/orders', order: 2, description: 'Order sheets, hub, registers, amendments' },
  { id: 'programs', label: 'Programs', icon: 'Workflow', landingRoute: '/programs/new', order: 3, description: 'Tirupur core: yarn/fabric programs & balances' },
  { id: 'procurement', label: 'Procurement', icon: 'ShoppingCart', landingRoute: '/procurement', order: 4, description: 'POs, GRNs, acceptance, party balance' },
  { id: 'inventory', label: 'Inventory & Warehouse', icon: 'Boxes', landingRoute: '/inventory', order: 5, description: 'Stock, ledger, lots, transfers' },
  { id: 'cutting', label: 'Cutting & Panels', icon: 'Scissors', landingRoute: '/cutting', order: 6, description: 'Job orders, ready-to-cut, panel ops' },
  { id: 'pieces', label: 'Pieces (Finished Goods)', icon: 'Shirt', landingRoute: '/pieces/despatch', order: 7, description: 'Pcs despatch/receipt/transfer/stock/packing' },
  { id: 'production', label: 'Production & Shopfloor', icon: 'Factory', landingRoute: '/production', order: 8, description: 'Entries, line issue/output, WIP, bundles' },
  { id: 'jobwork', label: 'Job Work', icon: 'Handshake', landingRoute: '/jobwork/order', order: 9, description: 'Outsourced jobwork out/in & balances' },
  { id: 'dispatch', label: 'Despatch & Logistics', icon: 'Truck', landingRoute: '/dispatch/unit-transfer-ack', order: 10, description: 'DCs (all materials), gate, courier, loading' },
  { id: 'accounts', label: 'Accounts & GST', icon: 'Receipt', landingRoute: '/accounts', order: 11, description: 'Invoices, bills, payments, journals, HSN' },
  { id: 'costing', label: 'Costing & Budgets', icon: 'Calculator', landingRoute: '/costing', order: 12, description: 'Cost sheets, budgets, expenses, P&L' },
  { id: 'hr', label: 'HR & Payroll', icon: 'Users', landingRoute: '/hr', order: 13, description: 'Employees, shifts, wages' },
  { id: 'quality', label: 'Quality & Lab', icon: 'FlaskConical', landingRoute: '/quality/reprocess-approval', order: 14, description: 'Lab tests, parameters, approvals' },
  { id: 'approvals', label: 'Approvals & Workflow', icon: 'CheckCircle2', landingRoute: '/approvals', order: 15, description: 'Cross-module approval inbox + audit' },
  { id: 'reports', label: 'Reports & Analytics', icon: 'BarChart3', landingRoute: '/reports', order: 16, description: 'Report hub, packs, MIS' },
  { id: 'masters-admin', label: 'Masters & Admin', icon: 'Database', landingRoute: '/masters', order: 17, description: '~40 masters, users, rights, options' },
]

// Approval-archetype forms (form-taxonomy.json, 18) — aggregated by the Approval Inbox.
const APPROVAL_FORMS = [
  'FrmAccItemApproval', 'FrmGoDownAck', 'FrmGodownTransferAck', 'FrmLocInvPackingListFormat',
  'FrmLocalInvConfirm', 'FrmLocalInvPackingList', 'FrmLocalInvPackingList_Solid', 'FrmNonReturnDCApproval',
  'FrmOrdProdTrack', 'FrmPackingList', 'FrmPackingList_Domestic', 'FrmPurGrnAccept',
  'FrmProGrnAccept', 'FrmReprocess_Approval', 'FrmUnitTransferAck', 'frmAccack',
  'frmLotApproval', 'frmcuttingack',
]

// Master-archetype forms (form-taxonomy.json, 52) — covered by the Masters screen.
const MASTER_FORMS = [
  'FRMBUYER', 'FrmAccDescMaster', 'FrmAccmaster', 'FrmBankMaster', 'FrmBuyerStatus', 'FrmCommRateMaster',
  'FrmConcern', 'FrmCountGroup', 'FrmDeliveryAtMas', 'FrmDeptMasterNew', 'FrmDesignEntry', 'FrmEmpmaster',
  'FrmFabricmaster', 'FrmFormas', 'FrmGodownMaster', 'FrmHSN', 'FrmHSNPce', 'FrmMachineCategory',
  'FrmMachineMaster', 'FrmMasBank', 'FrmMasBankAccount', 'FrmMasBuyerDept', 'FrmMasExpenses', 'FrmMasFabric',
  'FrmMasTemplate', 'FrmMasWorkNature', 'FrmMill', 'FrmPartyBalanceRegister', 'FrmPartyBlnc', 'FrmPartyMaster',
  'FrmPrdnRateMaster', 'FrmPreCostingCompMas', 'FrmPrg_KnittingPartyInclusion', 'FrmRange', 'FrmRangeGrp',
  'FrmRange_Orderwise', 'FrmRateMaster', 'FrmShadeEntry', 'FrmStageWiseTagMaster', 'FrmStateMaster',
  'FrmStyleMaster', 'FrmThreadTypeMaster', 'Frm_AppMas', 'Frm_Mas_Holiday', 'Frm_Master', 'Frm_OrderInputMas',
  'frmBuyerPLReport', 'frmDeptGroup', 'frmFCRmaster', 'frmFcymaster', 'frmFomGrp', 'frmSizeGroup',
]

// The 21 live master create_* tools (STATE: tool inventory).
const MASTER_CREATE_TOOLS = [
  'create_party', 'create_buyer', 'create_style', 'create_fabric', 'create_yarn', 'create_accessory',
  'create_godown', 'create_department', 'create_employee', 'create_colour', 'create_size', 'create_uom',
  'create_dia', 'create_lot', 'create_season', 'create_merchandiser', 'create_exporter', 'create_fin_year',
  'create_line', 'create_size_group', 'create_bom',
]

// ---------------------------------------------------------------------------
// ITEMS (132 — 113 parity + M9 live-tracker + M11 feature-flags + M19 ×13 registers + tally + M13 digest + M15 audit + M20 attendance + M21 waste-receipt) — SPEC-M1 §5.2
// (the count is TEST-PINNED in menu-registry.test.ts — keep this comment in
//  sync when a milestone adds an item; gap-audit §8-2 drift class)
// ---------------------------------------------------------------------------
export const MENU_ITEMS: MenuItem[] = [
  // ---- home (4) ----
  {
    id: 'dashboard', label: 'Dashboard', groupId: 'home', route: '/', arch: 'DB', phase: 'M1',
    description: 'KPI tiles and the 15-stage pipeline at a glance.',
    legacyForms: [], agentTools: ['get_dashboard_kpis'], pendingTools: [],
  },
  {
    id: 'order-status-board', label: 'Order Status Board', groupId: 'home', route: '/orders/status', arch: 'DB', phase: 'M4',
    description: 'Per-order 15-stage progress board with despatch/completion status.',
    legacyForms: ['frmOrdStat', 'FrmBuyerStatus', 'FrmOrderDespatchCompletion'],
    agentTools: ['suggest_next_step', 'get_order_status'], pendingTools: [],
    agentPrompt: 'Show me the current order status and what to do next',
  },
  {
    id: 'daily-in-out', label: 'Daily In/Out', groupId: 'home', route: '/registers/daily-in-out', arch: 'RG', phase: 'M4',
    description: 'Day-book of all stock in/out movements across godowns.',
    legacyForms: ['frmDailyinout'], agentTools: ['get_daily_in_out'], pendingTools: [],
    agentPrompt: 'Show me today\u2019s stock in and out',
  },
  {
    id: 'live-tracker', label: 'Live Tracker', groupId: 'home', route: '/tracker', arch: 'LT', phase: 'M9',
    description: 'Live operations pulse: every document, approval and agent turn as it is recorded.',
    legacyForms: [], agentTools: ['get_live_activity'], pendingTools: [],
    agentPrompt: 'What is going on in the factory right now?',
  },
  {
    id: 'daily-digest', label: 'Daily Digest', groupId: 'home', route: '/notifications/digest', arch: 'LT', phase: 'M13',
    description: 'Pending approvals, low-stock alerts and gate movements — the cron digest surface.',
    legacyForms: [], agentTools: ['get_pending_approvals', 'get_live_activity'], pendingTools: [],
    agentPrompt: 'What needs my attention today — approvals, low stock, gate movements?',
  },

  // ---- orders (9) ----
  {
    id: 'order-sheet-new', label: 'Order Sheet (new)', groupId: 'orders', route: '/orders/new', arch: 'DS', phase: 'M3',
    description: 'Keyboard-first sales order entry: header + size grid + deliveries.',
    legacyForms: ['FrmOrderSheetNew', 'FrmOrderSheetNew_Domestic', 'FrmOrderSheetNew_WithAmend', 'FrmTradingOrderSheet'],
    agentTools: ['create_order'], pendingTools: [],
    agentPrompt: 'I want to create a new sales order',
  },
  {
    id: 'order-hub', label: 'Order Hub (detail)', groupId: 'orders', route: '/orders/[id]', arch: 'DS', phase: 'M3',
    description: 'One page per order: its whole document family — programs, POs, GRNs, DCs, production, invoices — with rollups.',
    legacyForms: ['FrmOrdProdTrack', 'FrmIoHistoryReg', 'FrmBuyerStatus'],
    agentTools: ['get_order', 'suggest_next_step'], pendingTools: [],
    agentPrompt: 'Show me the full production track for an order',
    notes: 'RG+DS hybrid; full doc-family page (wiring W3)',
  },
  {
    id: 'order-enquiry', label: 'Order Enquiry / Search', groupId: 'orders', route: '/orders/enquiry', arch: 'RG', phase: 'M3',
    description: 'Search orders by buyer, style, date, status, doc no.',
    legacyForms: ['FrmOrderEnquiry', 'frmSearch'],
    agentTools: ['list_orders'], pendingTools: [],
    agentPrompt: 'Search my orders',
  },
  {
    id: 'order-register', label: 'Order Register', groupId: 'orders', route: '/orders/register', arch: 'RG', phase: 'M4',
    description: 'Filterable order day-book with totals.',
    legacyForms: ['FrmOrderReg', 'frmordwiseregregister', 'FrmOrderRegister_Spl'],
    agentTools: ['list_orders'], pendingTools: [],
    agentPrompt: 'List all orders',
  },
  {
    id: 'order-amendments', label: 'Amendments', groupId: 'orders', route: '/orders/amendments', arch: 'DS', phase: 'M3',
    description: 'Amend a confirmed order with history kept.',
    legacyForms: ['FrmOrderSheetAmendment'],
    agentTools: ['update_order'], pendingTools: [],
    agentPrompt: 'I want to amend an existing order',
    notes: 'M6-C: planOrderAmend (the update_order body extracted — one service, two doors)',
  },
  {
    id: 'order-close', label: 'Order Close', groupId: 'orders', route: '/orders/close', arch: 'DS', phase: 'M3',
    description: 'Close an order once shipped & billed; blocks further entries.',
    legacyForms: ['FrmOrderClose'],
    agentTools: ['close_order'], pendingTools: [],
    notes: 'M6-C: planCloseOrder guards (95% despatched + invoiced; force)',
  },
  {
    id: 'inhand-orders', label: 'In-Hand Orders', groupId: 'orders', route: '/orders/in-hand', arch: 'RG', phase: 'M4',
    description: 'Orders in hand: qty pending to produce/despatch per order.',
    legacyForms: ['ST_Ord_inHand'],
    agentTools: ['list_inhand_orders'], pendingTools: [],
    agentPrompt: 'Which orders are in hand and how much is pending',
  },
  {
    id: 'samples-enquiry', label: 'Samples & Enquiry', groupId: 'orders', route: '/orders/samples', arch: 'DS', phase: 'M5',
    description: 'Sample development tracking against buyer enquiries.',
    legacyForms: ['frmOrderSample', 'FrmSampleEntry_WithEnquiry'],
    agentTools: ['create_sample'], pendingTools: [],
  },
  {
    id: 'commercial-invoice', label: 'Commercial Invoice', groupId: 'orders', route: '/orders/commercial-invoice', arch: 'DS', phase: 'M5',
    description: 'Export commercial invoice for an order shipment.',
    legacyForms: ['FrmCommericalInv_New', 'FrmInvComm'],
    agentTools: ['create_commercial_invoice'], pendingTools: [],
  },

  // ---- programs (6) ----
  {
    id: 'program-entry', label: 'Program Entry', groupId: 'programs', route: '/programs/new', arch: 'DS', phase: 'M3',
    description: 'Program an order: yarn/fabric requirements with kgs/mtrs/pcs.',
    legacyForms: ['frmProgEntry', 'frmProgNew', 'frmProgEntry_Actual', 'frmProgEntry_YarnCons'],
    agentTools: ['create_program'], pendingTools: [],
    agentPrompt: 'I want to create a program for an order',
  },
  {
    id: 'program-propose', label: 'Propose from BOM', groupId: 'programs', route: '/programs/propose', arch: 'IN', phase: 'M43',
    description: 'BOM × order qty × wastage — the computed program requirements, one click to create.',
    legacyForms: [],
    agentTools: ['propose_program_requirements'], pendingTools: [],
    agentPrompt: 'Propose program requirements from the order BOM',
    notes: 'SPEC-M43 PRG-05: proposeProgramRequirements read service + one-click create through planProgram (one service, both doors)',
  },
  {
    id: 'program-status', label: 'Program Status', groupId: 'programs', route: '/programs/status', arch: 'RG', phase: 'M3',
    description: 'Program balances: required vs achieved per order — the operator\u2019s compass.',
    legacyForms: ['ST_ProgBalance_Yarn', 'ST_ProgBalance_Fabric'],
    agentTools: ['get_program_status'], pendingTools: [],
    agentPrompt: 'Show me program balances and pending requirements',
    notes: 'M6-C: queryProgramStatus (the get_program_status body extracted — one service, two doors)',
  },
  {
    id: 'program-cancel', label: 'Program Cancel', groupId: 'programs', route: '/programs/cancel', arch: 'DS', phase: 'M3',
    description: 'Cancel a program (accounting-aware, with approval).',
    legacyForms: ['frmProgCancel', 'FrmAcc_ProgCancel', 'frmProgCancel_Compwise'],
    agentTools: ['cancel_program'], pendingTools: [],
    notes: 'M6-C: planCancelProgram ledger net-zero guard',
  },
  {
    id: 'program-complete', label: 'Program Complete', groupId: 'programs', route: '/programs/complete', arch: 'DS', phase: 'M3',
    description: 'Mark a program complete; settles balances.',
    legacyForms: ['FrmProgramComplete'],
    agentTools: ['complete_program'], pendingTools: [],
    notes: 'M6-C: planCompleteProgram balance guard',
  },
  {
    id: 'fabric-acc-allotment', label: 'Fabric / Acc Allotment', groupId: 'programs', route: '/programs/allotment', arch: 'DS', phase: 'M5',
    description: 'Allot fabric/accessories combo-wise against programs.',
    legacyForms: ['frmFabricAllotment', 'frmComboWiseReqRpt'],
    agentTools: ['create_allotment'], pendingTools: [],
  },

  // ---- procurement (8) ----
  {
    id: 'purchase-order', label: 'Purchase Order', groupId: 'procurement', route: '/procurement/po', arch: 'DS', phase: 'M3',
    description: 'PO entry for yarn/fabric/accessories/general items.',
    legacyForms: ['frmPurchaseOrd_MultiOrder', 'frmPurchaseOrd_MultiOrder_HO', 'frmPurchaseOrdAcc', 'frmGeneralPurchaseOrd'],
    agentTools: ['create_purchase_order'], pendingTools: [],
    agentPrompt: 'I want to create a purchase order',
  },
  {
    id: 'po-cancel-complete', label: 'PO Cancel / Complete', groupId: 'procurement', route: '/procurement/po/close', arch: 'DS', phase: 'M3',
    description: 'Cancel or complete a purchase order.',
    legacyForms: ['FrmPOCancel', 'frmPoCompl'],
    agentTools: ['cancel_purchase_order', 'complete_purchase_order'], pendingTools: [],
    agentPrompt: 'I want to cancel a purchase order',
    notes: 'M6-C: planPoLifecycle — cancel delegates to planCancelPo (no fork)',
  },
  {
    id: 'grn-entry', label: 'GRN Entry', groupId: 'procurement', route: '/procurement/grn', arch: 'DS', phase: 'M3',
    description: 'Goods receipt note against a PO — stock in, rate, lot.',
    legacyForms: ['frmGRNEntry', 'frmGRNEntry_MultiOrder', 'frmGRNEntryAcc', 'frmGRNEntry_Ret_Multi'],
    agentTools: ['receive_grn'], pendingTools: [],
    agentPrompt: 'I want to record a GRN (goods receipt)',
  },
  {
    id: 'multi-process-grn', label: 'Multi-Process GRN', groupId: 'procurement', route: '/procurement/grn/multi-process', arch: 'DS', phase: 'M3',
    description: 'GRN for process returns across components.',
    legacyForms: ['frmGRN_MultiProcess', 'frmPrsGRNMulti', 'frmPrsGRNMulti_Compwise'],
    agentTools: ['receive_grn'], pendingTools: [],
    notes: 'M6-D: MP-#### variant (planMultiProcessGrn). Frozen mechanism names receive_grn as the agent door — ERRATUM: it cannot emit MP- rows (PO-based single-line); the form door is the MP path.',
  },
  {
    id: 'grn-acceptance', label: 'GRN Acceptance', groupId: 'procurement', route: '/procurement/grn/acceptance', arch: 'IN', phase: 'M3',
    description: 'Accept/reject received goods (purchase & process GRN queue).',
    legacyForms: ['FrmPurGrnAccept', 'FrmProGrnAccept'],
    agentTools: ['accept_grn'], pendingTools: [],
    agentPrompt: 'Show me pending approvals',
  },
  {
    id: 'supplier-orders', label: 'Supplier Orders', groupId: 'procurement', route: '/procurement/supplier-orders', arch: 'DS', phase: 'M5',
    description: 'Semi-finished supplier order sheets & tech packs.',
    legacyForms: ['FrmSuppOrdSheet_Semi', 'FrmSuppProdSequence', 'FrmSuppTechDataSheet'],
    agentTools: ['create_supplier_order', 'list_purchase_orders'], pendingTools: [],
  },
  {
    id: 'rate-confirmation', label: 'Rate Confirmation', groupId: 'procurement', route: '/procurement/rate-confirmation', arch: 'RG', phase: 'M5',
    description: 'Confirm yarn/fabric/accessory rates before billing.',
    legacyForms: ['RptYarnRateConfirm', 'RptFabRateConfirm', 'RptAccRateConfirm'],
    agentTools: ['list_po_rates'], pendingTools: [],
  },
  {
    id: 'party-balance', label: 'Party Balance', groupId: 'procurement', route: '/procurement/party-balance', arch: 'RG', phase: 'M4',
    description: 'Party-wise PO balances: ordered vs received vs pending.',
    legacyForms: ['FrmPartyBlnc', 'Sp_POBalnce'],
    agentTools: ['get_party_ledger'], pendingTools: [],
    agentPrompt: 'Show me party balances and pending POs',
  },
  {
    id: 'supplier-pending', label: 'Supplier Pending Orders', groupId: 'procurement', route: '/procurement/supplier-pending', arch: 'RG', phase: 'M19',
    description: 'Per-PO ordered vs received — the pending purchase chase list.',
    legacyForms: ['frmSupordPendReg'],
    agentTools: ['list_purchase_orders', 'get_party_ledger'], pendingTools: [],
    agentPrompt: 'Show me pending supplier orders',
  },
  {
    id: 'po-register', label: 'PO Register', groupId: 'procurement', route: '/procurement/po/register', arch: 'RG', phase: 'M19',
    description: 'The supplier PO day-book — every purchase order with type, party, dates and value.',
    legacyForms: ['FrmSupplierOrderRegister'],
    agentTools: ['list_purchase_orders'], pendingTools: [],
    agentPrompt: 'Show me the PO register',
  },
  {
    id: 'supplier-history', label: 'Supplier Order History', groupId: 'procurement', route: '/procurement/supplier-history', arch: 'RG', phase: 'M19',
    description: 'Per-supplier period rollup — POs, ordered vs received, last receipt date.',
    legacyForms: ['FrmSuppOrderHistoryReg'],
    agentTools: ['get_party_ledger'], pendingTools: [],
    agentPrompt: 'Show me supplier order history',
  },

  // ---- inventory (9) ----
  {
    id: 'stock-view', label: 'Stock View (live)', groupId: 'inventory', route: '/inventory/stock', arch: 'RG', phase: 'M2',
    description: 'Live current stock by item/godown — yarn, fabric, accessories, pieces.',
    legacyForms: ['frmStockView', 'frmfabstockshow', 'frmYarnStockShow', 'frmAccStockShow', 'frmAccShort'],
    agentTools: ['get_stock'], pendingTools: [],
    agentPrompt: 'Show me current stock',
    notes: 'M6-C: queryCurrentStock over the shared fetchCurrentStock read path',
  },
  {
    id: 'stock-ledger', label: 'Stock Ledger', groupId: 'inventory', route: '/inventory/ledger', arch: 'RG', phase: 'M4',
    description: 'Every stock movement (source of truth) with running balances.',
    legacyForms: ['FrmStockLedger', 'Vue_StkLedger'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me the stock ledger',
  },
  {
    id: 'stock-register', label: 'Stock Register', groupId: 'inventory', route: '/inventory/register', arch: 'RH', phase: 'M4',
    description: 'Printable stock registers: general, style-wise, pcs.',
    legacyForms: ['FrmStockRegister', 'FrmStockRegister_Style', 'FrmStockRegister_StylePcs', 'FrmStockRegister_SplRpt'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me the stock register',
  },
  {
    id: 'closing-stock', label: 'Closing Stock (as-of)', groupId: 'inventory', route: '/inventory/closing-stock', arch: 'RG', phase: 'M19',
    description: 'Period-end stock statement — cumulative in/out to the as-of date, per item and godown, with valuation.',
    legacyForms: ['FrmClosingStockRegister', 'RptClosingStock'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me closing stock as of a date',
  },
  // M19 Wave A (SPEC-M19 §1-B) — the material-wise day-books legacy operators lived in
  {
    id: 'yarn-stock', label: 'Yarn Stock Register', groupId: 'inventory', route: '/inventory/stock/yarn', arch: 'RG', phase: 'M19',
    description: 'The yarn day-book — every yarn movement (preset item type).',
    legacyForms: ['FrmYarnStockRegister'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me the yarn stock register',
  },
  {
    id: 'fabric-stock', label: 'Fabric Stock Register', groupId: 'inventory', route: '/inventory/stock/fabric', arch: 'RG', phase: 'M19',
    description: 'The fabric day-book — every fabric movement (preset item type).',
    legacyForms: ['FrmFabricStockRegister'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me the fabric stock register',
  },
  {
    id: 'acc-stock', label: 'Accessory Stock Register', groupId: 'inventory', route: '/inventory/stock/accessory', arch: 'RG', phase: 'M19',
    description: 'The accessory day-book — trims, labels, packing material movements.',
    legacyForms: ['FrmAccStockRegister'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me the accessory stock register',
  },
  {
    id: 'general-stock', label: 'General Stock Register', groupId: 'inventory', route: '/inventory/stock/general', arch: 'RG', phase: 'M19',
    description: 'The all-material day-book — yarn, fabric, accessory and pcs together.',
    legacyForms: ['FrmGeneralStockRegister'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me the general stock register',
  },
  {
    id: 'itemwise-stock', label: 'Itemwise Stock Register', groupId: 'inventory', route: '/inventory/stock/itemwise', arch: 'RG', phase: 'M19',
    description: 'Movements grouped per item for the period — in/out totals by uom.',
    legacyForms: ['FrmItemwiseStockRegister'],
    agentTools: ['get_stock_ledger'], pendingTools: [],
    agentPrompt: 'Show me itemwise stock movements for the period',
  },
  {
    id: 'opening-stock', label: 'Opening Stock', groupId: 'inventory', route: '/inventory/opening-stock', arch: 'DS', phase: 'M2',
    description: 'Set opening balances when onboarding a godown/item.',
    legacyForms: ['frmOpeningStock', 'frmOpeningStock_CompWise', 'frmPcsStagewiseOpeningStock'],
    agentTools: ['post_opening'], pendingTools: [],
  },
  {
    id: 'waste-receipt', label: 'Waste Receipt', groupId: 'inventory', route: '/inventory/waste-receipt', arch: 'DS', phase: 'M21',
    description: 'Receive waste/scrap into the waste store at the scrap rate (knitting/dyeing/cutting/packing/general classes).',
    legacyForms: ['FrmWasteReceiptEntry'],
    agentTools: ['receive_waste'], pendingTools: [],
    agentPrompt: 'Receive 25 kgs of knitting waste for yarn YRN-001 into the waste store',
  },
  {
    id: 'stock-take', label: 'Stock Take', groupId: 'inventory', route: '/inventory/stock-take', arch: 'DS', phase: 'M42',
    description: 'Count a godown against the book (ST-####) — commit drafts the variance ADJs.',
    legacyForms: [], // legacy had NO stock-verification form (grep-verified — the honest empty list)
    agentTools: ['create_stock_take', 'record_stock_counts', 'advance_stock_take'], pendingTools: [],
    agentPrompt: 'Start a stock take of godown G1, then record counts for every yarn',
  },
  {
    id: 'waste-percent', label: 'Waste %', groupId: 'inventory', route: '/inventory/waste-percent', arch: 'RG', phase: 'M42',
    description: 'Waste (WST-) kgs against production receipts per item — the knitting KPI.',
    legacyForms: [],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'stock-adjustment', label: 'Stock Adjustment', groupId: 'inventory', route: '/inventory/adjustment', arch: 'DS', phase: 'M3',
    description: 'Adjust stock with reason (shrinkage, audit correction).',
    legacyForms: ['frmStockAdjustment', 'frmStockAdjustment_Domestic'],
    agentTools: ['post_stock_adjustment'], pendingTools: [],
    agentPrompt: 'I want to adjust stock',
  },
  {
    id: 'godown-transfer', label: 'Godown Transfer + Ack', groupId: 'inventory', route: '/inventory/transfer', arch: 'DS', phase: 'M3',
    description: 'Move stock between godowns; receiver acknowledges.',
    legacyForms: ['FrmStkTransfer', 'FrmChangeGodown', 'FrmGoDownAck', 'FrmGodownTransferAck'],
    agentTools: ['transfer_stock'], pendingTools: [],
    agentPrompt: 'I want to transfer stock between godowns',
  },
  {
    id: 'lot-tracking', label: 'Lot Tracking', groupId: 'inventory', route: '/inventory/lots', arch: 'RG', phase: 'M4',
    description: 'Lot register: lots in, separated, consumed, pending approval.',
    legacyForms: ['FrmLotRegister', 'frmLotWiseDtl', 'FrmLotSeparate', 'frmLotApproval'],
    agentTools: ['list_lots'], pendingTools: [],
    agentPrompt: 'List lots',
  },
  {
    id: 'roll-tracking', label: 'Roll Tracking / Split', groupId: 'inventory', route: '/inventory/rolls', arch: 'DS', phase: 'M5',
    description: 'Roll-level fabric tracking and splitting.',
    legacyForms: ['Frm_RollSplit', 'CurrentStock_RollDtl'],
    agentTools: ['split_roll'], pendingTools: [],
  },
  {
    id: 'io-history', label: 'IO History', groupId: 'inventory', route: '/inventory/io-history', arch: 'RG', phase: 'M4',
    description: 'In/out history per item or party.',
    legacyForms: ['FrmIoHistoryReg', 'FrmIoHistoryReg_New'],
    agentTools: ['list_io_history'], pendingTools: [],
    agentPrompt: 'Show me the in/out history for an item or party',
  },

  // ---- cutting (10) ----
  {
    id: 'cutting-job-order', label: 'Cutting Job Order', groupId: 'cutting', route: '/cutting/job-order', arch: 'DS', phase: 'M3',
    description: 'Issue a cutting job order for a program/style.',
    legacyForms: ['frmCuttingJobOrder'],
    agentTools: ['create_cut_order'], pendingTools: [],
    agentPrompt: 'I want to create a cutting job order',
  },
  {
    id: 'cutting-issue', label: 'Cutting Issue', groupId: 'cutting', route: '/cutting/issue', arch: 'DS', phase: 'M3',
    description: 'Issue fabric rolls to the cutting table.',
    legacyForms: ['frmCuttingIssue'],
    agentTools: ['create_line_issue'], pendingTools: [],
    notes: 'M6-D: the wrapper validates line.deptId = D3 (ERRATUM: create_line_issue has no deptCode param — the dept rides line.deptId).',
  },
  {
    id: 'ready-to-cut', label: 'Ready to Cut', groupId: 'cutting', route: '/cutting/ready-to-cut', arch: 'DS', phase: 'M3',
    description: 'Move program stock into the ready-to-cut virtual department.',
    legacyForms: ['frmReadytoCut'],
    agentTools: ['ready_to_cut'], pendingTools: [],
    notes: 'M6-D: RTC-#### — ready_to_cut_out/-in pair; the virtual dept is a D3-keyed bucket (PITFALLS #12 legacy -7 → dept-keyed bucket).',
  },
  {
    id: 'cutting-production', label: 'Cutting Production', groupId: 'cutting', route: '/cutting/production', arch: 'DS', phase: 'M3',
    description: 'Post cut panel output (G1 pieces).',
    legacyForms: ['FrmCuttingProduction_Auto_New'],
    agentTools: ['post_production_entry'], pendingTools: [],
    agentPrompt: 'I want to post cutting production',
  },
  {
    id: 'cutting-register', label: 'Cutting Register', groupId: 'cutting', route: '/cutting/register', arch: 'RG', phase: 'M19',
    description: 'The cut day-book — every cutting job order with bundles, fabric issued and output pcs.',
    legacyForms: ['FrmCutingReg'],
    agentTools: ['list_cut_orders'], pendingTools: [],
    agentPrompt: 'Show me the cutting register',
  },
  {
    id: 'cutting-ack', label: 'Cutting Ack', groupId: 'cutting', route: '/cutting/ack', arch: 'IN', phase: 'M3',
    description: 'Acknowledge issued fabric reached cutting.',
    legacyForms: ['frmcuttingack'],
    agentTools: ['acknowledge_cutting_issue'], pendingTools: [],
  },
  {
    id: 'panel-cutting', label: 'Panel Cutting / Add', groupId: 'cutting', route: '/cutting/panel', arch: 'DS', phase: 'M5',
    description: 'Add/adjust panel cutting entries.',
    legacyForms: ['frmAddPanelCutting'],
    agentTools: ['create_cut_order'], pendingTools: [],
  },
  {
    id: 'panel-production', label: 'Panel Production', groupId: 'cutting', route: '/cutting/panel-production', arch: 'DS', phase: 'M5',
    description: 'Panel-wise production entries.',
    legacyForms: ['frmProduction_CutPanel'],
    agentTools: ['post_production_entry'], pendingTools: [],
  },
  {
    id: 'panel-rej-rework', label: 'Panel Rej / Rework', groupId: 'cutting', route: '/cutting/panel-rework', arch: 'DS', phase: 'M5',
    description: 'Panel rejections and delivery rework.',
    legacyForms: ['frmPanelRej', 'frmPanelDelRework'],
    agentTools: ['post_rejection'], pendingTools: [],
    agentPrompt: 'I want to post a panel rejection',
  },
  {
    id: 'panel-excess', label: 'Panel Excess', groupId: 'cutting', route: '/cutting/panel-excess', arch: 'DS', phase: 'M5',
    description: 'Excess panels produced vs plan.',
    legacyForms: ['FrmPanelExcessEntry', 'FrmPanelExcessEntry_Stage'],
    agentTools: ['post_production_entry'], pendingTools: [],
  },
  {
    id: 'fabric-rejection-return', label: 'Fabric Rejection Return', groupId: 'cutting', route: '/cutting/fab-rejection', arch: 'DS', phase: 'M5',
    description: 'Return rejected fabric from cutting to store.',
    legacyForms: ['FrmCutting_FabRej', 'FrmCuttingfabretreg'],
    agentTools: ['post_rejection'], pendingTools: [],
    agentPrompt: 'I want to return rejected fabric to the party',
  },
  // ---- pieces (9) ----
  {
    id: 'pcs-dc', label: 'Pcs DC (Despatch)', groupId: 'pieces', route: '/pieces/despatch', arch: 'DS', phase: 'M3',
    description: 'Despatch finished pieces (G2 out) to buyer with packing details.',
    legacyForms: ['frmPcsDel', 'frmPcsDel_Ship', 'frmPcsDelRework'],
    agentTools: ['create_pcs_despatch'], pendingTools: [],
    agentPrompt: 'I want to despatch finished pieces (Pcs DC)',
  },
  {
    id: 'pcs-receipt', label: 'Pcs Receipt', groupId: 'pieces', route: '/pieces/receipt', arch: 'DS', phase: 'M3',
    description: 'Receive pieces back from jobwork units.',
    legacyForms: ['frmPcsRec'],
    agentTools: ['receive_jobwork'], pendingTools: [],
    agentPrompt: 'I want to receive pieces back from jobwork',
  },
  {
    id: 'pcs-grn-acceptance', label: 'Pcs GRN Acceptance (GAN)', groupId: 'pieces', route: '/pieces/gan', arch: 'IN', phase: 'M3',
    description: 'GAN: goods acceptance note for received pieces.',
    legacyForms: ['FrmProGrnAccept'],
    agentTools: ['accept_jobwork_pcs'], pendingTools: [],
    notes: 'GAN semantics — PITFALLS #12 (receipts park pending acceptance before stock posts)',
  },
  {
    id: 'pcs-transfer', label: 'Pcs Transfer', groupId: 'pieces', route: '/pieces/transfer', arch: 'DS', phase: 'M3',
    description: 'Transfer finished pieces between godowns/units.',
    legacyForms: ['FrmPcsGodTransfer'],
    agentTools: ['transfer_stock'], pendingTools: [],
    notes: 'M6-D: PT-#### (planPcsTransfer — pcs buckets key on the ORDER; ERRATUM: base transfer_stock rejects itemType pcs).',
  },
  {
    id: 'pcs-rejection', label: 'Pcs Rejection', groupId: 'pieces', route: '/pieces/rejection', arch: 'DS', phase: 'M3',
    description: 'Reject damaged pieces (scrap or return).',
    legacyForms: ['frmPcsRej'],
    agentTools: ['post_rejection'], pendingTools: [],
    agentPrompt: 'I want to post a pieces rejection',
  },
  {
    id: 'pcs-shortage', label: 'Pcs Shortage', groupId: 'pieces', route: '/pieces/shortage', arch: 'DS', phase: 'M5',
    description: 'Record shortages found at despatch/packing.',
    legacyForms: ['frmPcsShort', 'frmShortage', 'frmShortage_Compwise', 'FrmShortageBitEntry'],
    agentTools: ['post_rejection'], pendingTools: [],
    agentPrompt: 'I want to record a pcs shortage',
  },
  {
    id: 'pcs-stock', label: 'Pcs Stock', groupId: 'pieces', route: '/pieces/stock', arch: 'RG', phase: 'M4',
    description: 'Finished goods stock incl. rejected pieces.',
    legacyForms: ['FrmPieceStock', 'FrmPieceStock_All', 'FrmRejPieceStock'],
    agentTools: ['get_stock'], pendingTools: [],
    agentPrompt: 'Show me finished goods (pcs) stock',
  },
  {
    id: 'orderwise-pcs', label: 'Orderwise Pcs Register', groupId: 'pieces', route: '/pieces/orderwise', arch: 'RG', phase: 'M19',
    description: 'Pcs stock grouped by order — styles, godowns, pcs and value per order.',
    legacyForms: ['FrmOrderwisePcsReg'],
    agentTools: ['get_stock'], pendingTools: [],
    agentPrompt: 'Show me pcs stock grouped by order',
  },
  {
    id: 'finished-goods-entry', label: 'Finished Goods Entry', groupId: 'pieces', route: '/pieces/finished-goods', arch: 'DS', phase: 'M5',
    description: 'Enter finished goods into FG store.',
    legacyForms: ['FrmFinishGoodsEntry'],
    agentTools: ['post_finished_goods'], pendingTools: [],
    agentPrompt: 'I want to post a finished-goods entry',
  },
  {
    id: 'packing-list', label: 'Packing List', groupId: 'pieces', route: '/pieces/packing-list', arch: 'DS', phase: 'M5',
    description: 'Carton-wise packing list per despatch (solid/assorted).',
    legacyForms: ['FrmPackingList', 'FrmPackingList_Domestic', 'FrmLocalInvPackingList', 'FrmPackingList_Solid'],
    agentTools: ['create_packing_list'], pendingTools: [],
  },

  // ---- production (9) ----
  {
    id: 'production-entry', label: 'Production Entry', groupId: 'production', route: '/production/entry', arch: 'DS', phase: 'M3',
    description: 'Post production output per line/stage (G2 pieces in).',
    legacyForms: ['frmProduction'],
    agentTools: ['post_production_entry'], pendingTools: [],
    agentPrompt: 'I want to post a production entry',
  },
  {
    id: 'issue-to-line', label: 'Issue to Line', groupId: 'production', route: '/production/issue', arch: 'DS', phase: 'M3',
    description: 'Issue cut panels/pieces to a sewing line.',
    legacyForms: ['FrmIssueToProduction', 'FrmLineInput', 'FrmLineInput_Manual'],
    agentTools: ['issue_to_line'], pendingTools: [],
    agentPrompt: 'I want to issue pieces to a production line',
  },
  {
    id: 'line-issue-register', label: 'Issue to Line Register', groupId: 'production', route: '/production/issue/register', arch: 'RG', phase: 'M19',
    description: 'Order/bundle issues to sewing lines — the issue-to-line day-book.',
    legacyForms: ['FrmOrdBundIssToLineReg'],
    agentTools: ['get_line_status', 'issue_to_line'], pendingTools: [],
    agentPrompt: 'Show me issues to lines',
  },
  {
    id: 'line-output', label: 'Line Output', groupId: 'production', route: '/production/line-output', arch: 'DS', phase: 'M3',
    description: 'Record line output (manual entry).',
    legacyForms: ['frmLineOutputManual', 'frmLineOutputManual_New'],
    agentTools: ['post_production_entry'], pendingTools: [],
  },
  {
    id: 'line-status', label: 'Line Status / WIP', groupId: 'production', route: '/production/line-status', arch: 'DB', phase: 'M3',
    description: 'Live WIP per line: issued vs produced vs pending.',
    legacyForms: [],
    agentTools: ['get_line_status'], pendingTools: [],
    agentPrompt: 'Show me line status and WIP',
    notes: 'M6-C: WIP board over queryLineWip (the line-wip report service — one query layer); legacy used EmpID-as-LineID trick',
  },
  {
    id: 'rework', label: 'Rework', groupId: 'production', route: '/production/rework', arch: 'DS', phase: 'M3',
    description: 'Send pieces/panels back for rework.',
    legacyForms: [],
    agentTools: ['post_rework'], pendingTools: [],
    agentPrompt: 'I want to post a rework entry',
    notes: 'Legacy rework flag 0/1/2 semantics',
  },
  {
    id: 'bundle-barcode', label: 'Bundle / Barcode Entry', groupId: 'production', route: '/production/bundles', arch: 'DS', phase: 'M5',
    description: 'Bundle tickets + barcode scanning on the floor.',
    legacyForms: ['FrmBundle_ProductionEntry', 'frmBarcodeReadingNew'],
    agentTools: ['scan_bundle'], pendingTools: [],
    agentPrompt: 'Scan bundle CUT-0001/B1 for operator E001',
  },
  {
    id: 'line-transfer', label: 'Line Transfer', groupId: 'production', route: '/production/line-transfer', arch: 'DS', phase: 'M5',
    description: 'Move WIP between sewing lines.',
    legacyForms: ['Trs_LineTfr'],
    agentTools: ['transfer_line_stock'], pendingTools: [],
    agentPrompt: 'I want to transfer WIP between lines',
  },
  {
    id: 'operation-entry', label: 'Operation Entry', groupId: 'production', route: '/production/operations', arch: 'DS', phase: 'M5',
    description: 'Sub-process/operation-wise entries.',
    legacyForms: ['FrmOperationEntry', 'Frm_SubProcess'],
    agentTools: ['post_operation_entry'], pendingTools: [],
    agentPrompt: 'I want to post an operation entry',
  },
  {
    id: 'production-status-register', label: 'Production Status Register', groupId: 'production', route: '/production/register', arch: 'RG', phase: 'M4',
    description: 'Production status day-book (in-house + jobwork).',
    legacyForms: ['FrmProductionStatusReg', 'FrmInhouseProductionStatusReg'],
    agentTools: ['get_production_status'], pendingTools: [],
    agentPrompt: 'Show me production status per order and department',
  },

  // ---- jobwork (5) ----
  {
    id: 'jobwork-order', label: 'Jobwork Order (out)', groupId: 'jobwork', route: '/jobwork/order', arch: 'DS', phase: 'M3',
    description: 'Send work out to a jobwork unit with terms.',
    legacyForms: [],
    agentTools: ['create_jobwork_order'], pendingTools: [],
    agentPrompt: 'I want to create a jobwork order',
    notes: 'Legacy JW semantics',
  },
  {
    id: 'jobwork-receipt', label: 'Jobwork Receipt (in)', groupId: 'jobwork', route: '/jobwork/receipt', arch: 'DS', phase: 'M3',
    description: 'Receive completed work back from jobwork units.',
    legacyForms: [],
    agentTools: ['receive_jobwork'], pendingTools: [],
    agentPrompt: 'I want to receive jobwork back',
  },
  {
    id: 'contract-allotment', label: 'Contract Allotment', groupId: 'jobwork', route: '/jobwork/contract', arch: 'DS', phase: 'M5',
    description: 'Allot contracts to jobwork units.',
    legacyForms: ['frmContractAllotment', 'frmContractAllotment_New'],
    agentTools: ['allot_contract'], pendingTools: [],
  },
  {
    id: 'job-order-list', label: 'Job Order List / Balance', groupId: 'jobwork', route: '/jobwork/register', arch: 'RG', phase: 'M4',
    description: 'Jobwork orders with issued/returned/at-party balances.',
    legacyForms: ['FrmJobOrderList'],
    agentTools: ['list_jobworks'], pendingTools: [],
    agentPrompt: 'List jobwork orders and balances',
    notes: 'Also party/unit-wise balance reports',
  },
  {
    id: 'jobwork-pcs-return', label: 'Jobwork Pcs Return', groupId: 'jobwork', route: '/jobwork/pcs-return', arch: 'DS', phase: 'M5',
    description: 'Return pieces to jobwork units for rework.',
    legacyForms: ['frmJobWorkPcsReturn'],
    agentTools: ['return_jobwork_pcs'], pendingTools: [],
    agentPrompt: 'I want to return pieces to a jobwork unit',
  },
  {
    id: 'jobworker-statement', label: 'Jobworker Statement', groupId: 'jobwork', route: '/jobwork/statement', arch: 'RG', phase: 'M39',
    description: 'Material at jobworkers: out / in / loss % / WIP + aging (per party × item).',
    legacyForms: [],
    agentTools: ['list_jobworker_statement'], pendingTools: [],
    agentPrompt: 'How much material is lying at each jobworker?',
  },

  // ---- dispatch (8) ----
  {
    id: 'dc-entry', label: 'Fabric/Yarn/Acc/Gen DC', groupId: 'dispatch', route: '/dispatch/dc', arch: 'DS', phase: 'M3',
    description: 'Delivery challans for material going out (process/jobwork).',
    legacyForms: ['FrmFabDel', 'FrmAccDel', 'FrmGenDC', 'FrmYarnDel'],
    agentTools: ['create_dc'], pendingTools: [],
    notes: 'M6-D: MDC-#### (DC- space shared with despatch FORBIDDEN — SPEC-M6 §2 row 30)',
  },
  {
    id: 'process-dc', label: 'Process DC (multi)', groupId: 'dispatch', route: '/dispatch/dc/process', arch: 'DS', phase: 'M3',
    description: 'Multi-component process delivery challans.',
    legacyForms: ['frmPrsDelMulti', 'frmPrsDelMulti_Acc', 'frmPrsDelMulti_Compwise'],
    agentTools: ['create_dc'], pendingTools: [],
  },
  {
    id: 'dc-return', label: 'DC Return', groupId: 'dispatch', route: '/dispatch/dc-return', arch: 'DS', phase: 'M3',
    description: 'Return unsent/rejected material against a DC.',
    legacyForms: ['FrmAccDel_Return', 'FrmFabDel_Return', 'RPtFabDcRet'],
    agentTools: ['receive_grn'], pendingTools: [],
    notes: 'M6-D: RTN-#### (planDcReturn — process_receipt IN; ERRATUM: receive_grn cannot reference a DC — the form door is the RTN path).',
  },
  {
    id: 'gate-entry', label: 'Gate Entry', groupId: 'dispatch', route: '/dispatch/gate-entry', arch: 'DS', phase: 'M5',
    description: 'Vehicle/visitor gate log for incoming material.',
    legacyForms: ['FrmGateEntry', 'FrmDirectBill_GateEntry'],
    agentTools: ['create_gate_entry'], pendingTools: [],
  },
  {
    id: 'gate-pass', label: 'Gate Pass', groupId: 'dispatch', route: '/dispatch/gate-pass', arch: 'DS', phase: 'M5',
    description: 'Gate pass for outgoing material/vehicles.',
    legacyForms: ['FrmGatePass'],
    agentTools: ['create_gate_pass'], pendingTools: [],
  },
  {
    id: 'unit-transfer-ack', label: 'Unit Transfer Ack', groupId: 'dispatch', route: '/dispatch/unit-transfer-ack', arch: 'IN', phase: 'M5',
    description: 'Acknowledge inter-unit transfers.',
    legacyForms: ['FrmUnitTransferAck'],
    agentTools: ['get_pending_approvals', 'acknowledge_unit_transfer'], pendingTools: [],
  },
  {
    id: 'courier-dc', label: 'Courier DC', groupId: 'dispatch', route: '/dispatch/courier', arch: 'DS', phase: 'M6',
    description: 'Courier despatch challans (samples/documents).',
    legacyForms: ['CourierDC'],
    agentTools: ['create_courier_dc'], pendingTools: [],
    notes: 'Variant of despatch mode=courier (SPEC-M6 §7-B-3) — courierName required, DC-#### space',
  },
  {
    id: 'loading', label: 'Loading', groupId: 'dispatch', route: '/dispatch/loading', arch: 'DS', phase: 'M6',
    description: 'Loading/challan consolidation for shipment.',
    legacyForms: ['FrmLoading'],
    agentTools: ['create_loading_challan'], pendingTools: [],
    notes: 'Variant of despatch mode=loading (SPEC-M6 §7-B-4) — LAD-#### space, status starts loading',
  },
  {
    id: 'despatch-register', label: 'Despatch Register', groupId: 'dispatch', route: '/dispatch/register', arch: 'RG', phase: 'M41',
    description: 'Despatch day-book — DC & LAD rows with aging and the gate-pass join.',
    legacyForms: [], // the legacy despatch registers were reports; this is the app's day-book
    agentTools: ['list_despatches'], pendingTools: [],
    agentPrompt: 'Show me the despatch register with aging',
    notes: 'SPEC-M41 PRC-05/07 — aging anchored at deliveredAt ?? despatchDate; gate-pass join surfaces DCs without a GP-',
  },

  // ---- accounts (12) ----
  {
    id: 'sales-invoice', label: 'Sales Invoice', groupId: 'accounts', route: '/accounts/invoice', arch: 'DS', phase: 'M3',
    description: 'Tax invoice against a despatch/order.',
    legacyForms: ['frmSalINV', 'frmNewInv'],
    agentTools: ['create_sales_invoice'], pendingTools: [],
    agentPrompt: 'I want to create a sales invoice',
  },
  {
    id: 'local-invoice', label: 'Local Invoice', groupId: 'accounts', route: '/accounts/invoice/local', arch: 'DS', phase: 'M5',
    description: 'Local (domestic) invoices with confirmation flow.',
    legacyForms: ['FrmLocalInvoice', 'FrmLocalInvConfirm'],
    agentTools: ['create_sales_invoice'], pendingTools: [],
  },
  {
    id: 'piece-jobwork-invoice', label: 'Piece / Jobwork Invoice', groupId: 'accounts', route: '/accounts/invoice/piece', arch: 'DS', phase: 'M5',
    description: 'Piece-rate and jobwork invoicing.',
    legacyForms: ['frmPieceInv', 'frmPieceInv_1', 'Rpt_JobwrkInvoice'],
    agentTools: ['create_sales_invoice'], pendingTools: [],
  },
  {
    id: 'debit-note', label: 'Debit Note', groupId: 'accounts', route: '/accounts/debit-note', arch: 'DS', phase: 'M3',
    description: 'Debit notes to parties (rate diff, rejection, claims).',
    legacyForms: ['frmdebitnote', 'frmDirectDebitNote'],
    agentTools: ['create_debit_note'], pendingTools: [],
    agentPrompt: 'I want to raise a debit note',
  },
  {
    id: 'supplier-bill', label: 'Supplier Bill', groupId: 'accounts', route: '/accounts/bill', arch: 'DS', phase: 'M40',
    description: 'SB-#### supplier bills from purchase GRNs — 3-way match, TDS, pass gate, FIFO payments.',
    legacyForms: ['FrmSupplierBillReg'],
    agentTools: ['create_supplier_bill', 'create_bill_pass'], pendingTools: [],
    agentPrompt: 'I want to enter a supplier bill',
  },
  {
    id: 'bill-pass', label: 'Bill Pass', groupId: 'accounts', route: '/accounts/bill-pass', arch: 'IN', phase: 'M5',
    description: 'Pass supplier bills (SB-####) for payment — the 3-way match gate.',
    legacyForms: ['frmBillPass'],
    agentTools: ['get_pending_approvals', 'create_bill_pass'], pendingTools: [],
  },
  {
    id: 'bills-register', label: 'Bills Register', groupId: 'accounts', route: '/accounts/bills-register', arch: 'RG', phase: 'M4',
    description: 'Bills day-book with additions/deductions.',
    legacyForms: ['FrmBillsReg', 'FrmBillsAddDedReport'],
    agentTools: ['get_bills_register'], pendingTools: [],
    agentPrompt: 'Show me the bills register with outstanding',
    notes: 'Also 10 dept variants',
  },
  {
    id: 'supplier-bill-register', label: 'Supplier Bill Register', groupId: 'accounts', route: '/accounts/supplier-bills', arch: 'RG', phase: 'M4',
    description: 'Supplier-wise bill register.',
    legacyForms: ['FrmSupplierBillReg'],
    agentTools: ['list_supplier_bills'], pendingTools: [],
    agentPrompt: 'Show me the supplier bill register',
  },
  {
    id: 'tally-export', label: 'Tally Export', groupId: 'accounts', route: '/accounts/tally-export', arch: 'RG', phase: 'M19',
    description: 'Sales/receipts/payments/journals for a window as Tally-import JSON, with preview counts.',
    legacyForms: ['FrmTallyExport'],
    agentTools: ['list_invoices'], pendingTools: [],
    agentPrompt: 'Show me invoices and payments for this month',
  },
  {
    id: 'payments-receipts', label: 'Payments & Receipts', groupId: 'accounts', route: '/accounts/payments', arch: 'DS', phase: 'M3',
    description: 'Record payments out and receipts in; settles invoices.',
    legacyForms: ['FrmPaymentReg'],
    agentTools: ['record_payment'], pendingTools: [],
    agentPrompt: 'I want to record a payment or receipt',
  },
  {
    id: 'party-ledger', label: 'Party Ledger', groupId: 'accounts', route: '/accounts/party-ledger', arch: 'RG', phase: 'M4',
    description: 'Party-wise ledger with balances.',
    legacyForms: ['FrmPartyBalanceRegister'],
    agentTools: ['get_party_ledger'], pendingTools: [],
    agentPrompt: 'Show me a party\u2019s ledger',
  },
  {
    id: 'journal', label: 'Journal', groupId: 'accounts', route: '/accounts/journal', arch: 'DS', phase: 'M3',
    description: 'Manual journal vouchers.',
    legacyForms: [],
    agentTools: ['create_journal'], pendingTools: [],
    agentPrompt: 'I want to pass a journal entry',
  },
  {
    id: 'production-bills', label: 'Production Bills (piece-rate)', groupId: 'accounts', route: '/accounts/production-bills', arch: 'DS', phase: 'M5',
    description: 'Piece-rate production billing for lines/employees.',
    legacyForms: ['FrmProdBillNew'],
    agentTools: ['create_production_bill'], pendingTools: [],
  },
  {
    id: 'hsn-gst-setup', label: 'HSN / GST Setup', groupId: 'accounts', route: '/accounts/hsn-gst', arch: 'ST', phase: 'M2',
    description: 'HSN codes and GST rates per item.',
    legacyForms: ['FrmHSN', 'FrmHSNPce', 'FrmTally_GSTSetup'],
    agentTools: ['create_hsn', 'update_hsn', 'list_hsns'], pendingTools: [],
  },

  // ---- costing (7) ----
  {
    id: 'cost-sheet', label: 'Cost Sheet', groupId: 'costing', route: '/costing/cost-sheet', arch: 'DS', phase: 'M3',
    description: 'Per-order cost sheet: fabric, trim, labour, overheads.',
    legacyForms: [],
    agentTools: ['create_cost_sheet'], pendingTools: [],
    agentPrompt: 'I want to create a cost sheet',
  },
  {
    id: 'costing-input', label: 'Costing Input', groupId: 'costing', route: '/costing/input', arch: 'DS', phase: 'M5',
    description: 'Multi-level daily costing inputs.',
    legacyForms: ['Frm_CostingInput'],
    agentTools: ['create_cost_sheet'], pendingTools: [],
    agentPrompt: 'I want to record a daily costing input',
    notes: 'Also multi-level daily variants',
  },
  {
    id: 'budget', label: 'Budget', groupId: 'costing', route: '/costing/budget', arch: 'DS', phase: 'M5',
    description: 'Jobwork/production budgets and pre-budget plans.',
    legacyForms: ['frmBudget', 'frmBudgetNew_JobWork', 'frmPreBudgetProdPlan'],
    agentTools: ['create_budget', 'get_budget_vs_actual'], pendingTools: [],
  },
  {
    id: 'budget-vs-actual', label: 'Budget vs Actual', groupId: 'costing', route: '/costing/budget-vs-actual', arch: 'RG', phase: 'M4',
    description: 'Compare budgets against actual consumption/spend.',
    legacyForms: ['FrmBudgetAndActualComp'],
    agentTools: ['get_budget_vs_actual'], pendingTools: [],
    agentPrompt: 'Show me budget vs actual',
  },
  {
    id: 'expenses', label: 'Expenses', groupId: 'costing', route: '/costing/expenses', arch: 'DS', phase: 'M5',
    description: 'Fixed/style-wise expense entries.',
    legacyForms: ['FrmExpenses', 'FrmFixedExpensesEntry', 'FrmStylewiseExpensesEntry'],
    agentTools: ['create_expense'], pendingTools: [],
  },
  {
    id: 'daily-unit-pnl', label: 'Daily Unit P&L', groupId: 'costing', route: '/costing/daily-pnl', arch: 'RH', phase: 'M6',
    description: 'Daily profit & loss per unit.',
    legacyForms: ['Sp_DailyUnitPANDL'],
    agentTools: ['render_report'], pendingTools: [],
    notes: 'ReportScreen for slug daily-unit-pnl (SPEC-M6 §4 rule b)',
  },
  {
    id: 'piece-rate-confirmation', label: 'Piece-Rate Confirmation', groupId: 'costing', route: '/costing/piece-rate', arch: 'RH', phase: 'M5',
    description: 'Confirm piece rates before wage billing.',
    legacyForms: ['RptPieceRateConfirm', 'RptPieceRateConfirm_InHouse'],
    agentTools: ['list_piece_rates'], pendingTools: [],
  },
  // ---- hr (4) ----
  {
    id: 'employees', label: 'Employees & Contractors', groupId: 'hr', route: '/hr/employees', arch: 'MT', phase: 'M2',
    description: 'Employee and contractor master.',
    legacyForms: ['FrmEmpmaster'],
    agentTools: ['create_employee'], pendingTools: [],
    agentPrompt: 'I want to add an employee',
  },
  {
    id: 'shifts-hours', label: 'Shifts & Hours', groupId: 'hr', route: '/hr/shifts', arch: 'MT', phase: 'M5',
    description: 'Shift definitions and hourly settings.',
    legacyForms: ['frmHours', 'FrmHourlySetting1'],
    agentTools: ['create_shift', 'update_shift', 'list_shifts'], pendingTools: [],
  },
  {
    id: 'production-wages', label: 'Production Wages', groupId: 'hr', route: '/hr/wages', arch: 'RG', phase: 'M5',
    description: 'Wage computation from production (dept/stage-wise).',
    legacyForms: ['Frm_ProductionWages', 'Frm_ProductionWages_Dept', 'Frm_ProductionWages_Stage'],
    agentTools: ['get_production_wages', 'create_journal'], pendingTools: [],
    agentPrompt: 'Show me production wages per operator',
    notes: 'RG family screen per SPEC-M5 §2 (arch upgraded DS→RG); wage bill posts a journal',
  },
  {
    id: 'wage-payments', label: 'Wage Payments', groupId: 'hr', route: '/hr/wage-payments', arch: 'DS', phase: 'M5',
    description: 'Pay wages; settlements per employee/unit.',
    legacyForms: ['FrmPaymentReg_Wages'],
    agentTools: ['pay_wages'], pendingTools: [],
    agentPrompt: 'Pay wages to operator party EMP-0001',
  },
  {
    id: 'attendance', label: 'Attendance', groupId: 'hr', route: '/hr/attendance', arch: 'RG', phase: 'M20',
    description: 'Daily attendance day-book (present/absent/half/leave) — posted via the agent.',
    legacyForms: ['frmAttandance'],
    agentTools: ['list_attendance'], pendingTools: ['post_attendance'],
    agentPrompt: 'Show me today\u2019s attendance',
    notes: 'SPEC-M20 Gap D closure — the HR view\u2019s Post-Attendance-via-Agent button has its backing tool; register default window = today',
  },
  {
    id: 'po-amendments', label: 'PO Amendments', groupId: 'procurement', route: '/procurement/po/amendments', arch: 'DS', phase: 'M41',
    description: 'Amend a purchase order — delivery date, status, notes, per-line qty/rate revisions with a trail.',
    legacyForms: [], // the legacy app had NO PO amendment (the PRC-02 gap)
    agentTools: ['update_purchase_order'], pendingTools: [],
    agentPrompt: 'Amend PO-Y-001 delivery date to month end',
    notes: 'SPEC-M41 PRC-02 — the planOrderAmend twin for POs; qty below already-received refuses',
  },
  {
    id: 'purchase-return', label: 'Purchase Return', groupId: 'procurement', route: '/procurement/purchase-return', arch: 'DS', phase: 'M41',
    description: 'Return rejected goods to a supplier against a GRN (PRN-####), optionally raising a debit note.',
    legacyForms: ['frmGRNEntryAcc_Ret_Multi'], // the real GRN-return form
    agentTools: ['create_purchase_return'], pendingTools: [],
    agentPrompt: 'Return 5 kgs of yarn from GRN-0001 to the supplier',
    notes: 'SPEC-M41 PRC-03 — supplier-pending unaffected (bills rule); rejectedQty guards per line',
  },

  // ---- quality (5) ----
  {
    id: 'lab-test-entry', label: 'Lab Test Entry', groupId: 'quality', route: '/quality/lab-tests', arch: 'DS', phase: 'M5',
    description: 'Record fabric/yarn lab test results.',
    legacyForms: ['FrmLabTest', 'FrmNewLabTest'],
    agentTools: ['create_lab_test'], pendingTools: [],
  },
  {
    id: 'test-parameters', label: 'Test Parameters / Stages', groupId: 'quality', route: '/quality/parameters', arch: 'MT', phase: 'M2',
    description: 'Lab test parameters and stage definitions.',
    legacyForms: ['FrmLabTestParameters', 'FrmLabTestParameters_Stages', 'FrmLabTestParameters_InputParameters'],
    agentTools: ['create_test_parameter', 'update_test_parameter', 'list_test_parameters'], pendingTools: [],
  },
  {
    id: 'lot-approval', label: 'Lot Approval', groupId: 'quality', route: '/quality/lot-approval', arch: 'IN', phase: 'M3',
    description: 'Approve dyeing/knitting lots into stock.',
    legacyForms: ['frmLotApproval'],
    agentTools: ['approve_lot'], pendingTools: [],
  },
  {
    id: 'reprocess-approval', label: 'Reprocess Approval', groupId: 'quality', route: '/quality/reprocess-approval', arch: 'IN', phase: 'M5',
    description: 'Approve reprocessing of defective material.',
    legacyForms: ['FrmReprocess_Approval'],
    agentTools: ['get_pending_approvals', 'approve_reprocess'], pendingTools: [],
  },
  {
    id: 'non-return-dc-approval', label: 'Non-Return DC Approval', groupId: 'quality', route: '/quality/non-return-dc', arch: 'IN', phase: 'M5',
    description: 'Approve DCs whose material will not return.',
    legacyForms: ['FrmNonReturnDCApproval'],
    agentTools: ['get_pending_approvals', 'approve_non_return_dc'], pendingTools: [],
  },

  // ---- approvals (2) ----
  {
    id: 'approval-inbox', label: 'Approval Inbox', groupId: 'approvals', route: '/approvals', arch: 'IN', phase: 'M1',
    description: 'One queue for every pending approval: agent plans, GRN acceptance, GAN, bill pass, rate/lot/reprocess approvals.',
    legacyForms: APPROVAL_FORMS,
    agentTools: ['get_pending_approvals'], pendingTools: [],
    notes: 'Aggregates all 18 approval-type legacy forms; specific approvals also have their own items',
  },
  {
    id: 'approval-audit-trail', label: 'Approval Audit Trail', groupId: 'approvals', route: '/approvals/audit', arch: 'RG', phase: 'M4',
    description: 'Who approved what, when — every decision logged.',
    legacyForms: [],
    agentTools: ['get_approval_audit'], pendingTools: [],
    agentPrompt: 'Show me the approval audit trail',
    notes: 'Modern source: AgentTurn log; no legacy form',
  },

  // ---- reports (3) ----
  {
    id: 'report-hub', label: 'Report Hub', groupId: 'reports', route: '/reports', arch: 'RH', phase: 'M6',
    description: 'All ~80 unique legacy reports, parameterized, preview + PDF/CSV.',
    legacyForms: [],
    agentTools: ['render_report'], pendingTools: [],
    notes: '28-report registry over ONE service layer (SPEC-M6 §4); the legacy 491 files dedup to these packs',
  },
  {
    id: 'report-packs', label: 'Order / Production / Inventory / Accounts packs', groupId: 'reports', route: '/reports/packs', arch: 'RH', phase: 'M6',
    description: 'Domain-wise report packs.',
    legacyForms: [],
    agentTools: ['render_report'], pendingTools: [],
    notes: '6 packs incl. costing-HR + quality (SPEC-M6 §4)',
  },
  {
    id: 'mis-dashboard', label: 'MIS Dashboard', groupId: 'reports', route: '/reports/mis', arch: 'DB', phase: 'M6',
    description: 'Management information dashboards.',
    legacyForms: ['frmMIS', 'FrmMISSetting'],
    agentTools: ['get_dashboard_kpis', 'render_report'], pendingTools: [],
    notes: 'Tiles + 14-day production bars, all from REPORT_SERVICES (SPEC-M6 §4)',
  },

  // ---- masters-admin (6) ----
  {
    id: 'masters', label: 'All Masters (~40 entities)', groupId: 'masters-admin', route: '/masters', arch: 'MT', phase: 'M2',
    description: 'Party, buyer, style, fabric, yarn, accessory, godown, dept, employee, colour, size, UOM, dia, lot, season + 25 more — one MasterTable engine.',
    legacyForms: MASTER_FORMS,
    agentTools: MASTER_CREATE_TOOLS.concat(['update_party', 'update_buyer', 'update_style', 'update_employee']), pendingTools: [],
  },
  {
    id: 'users-groups', label: 'Users & Groups', groupId: 'masters-admin', route: '/admin/users', arch: 'ST', phase: 'M6',
    description: 'User accounts and groups.',
    legacyForms: ['FrmMasuser', 'FrmUserGroupMas'],
    agentTools: ['create_user', 'update_user', 'create_user_group', 'update_user_group', 'list_users'], pendingTools: [],
    notes: 'Two MasterTables ?tab=users|groups (SPEC-M6 §7-B-2); auth itself is a non-goal (§3-1)',
  },
  {
    id: 'menu-rights', label: 'Menu Rights', groupId: 'masters-admin', route: '/admin/menu-rights', arch: 'ST', phase: 'M6',
    description: 'Which group sees which menu items.',
    legacyForms: ['FrmMenuRights', 'FrmMenuAccRights'],
    agentTools: ['update_user_group'], pendingTools: [],
    notes: 'Rights matrix over UserGroup.rights × MENU_GROUPS — saves via the update_user_group door (SPEC-M6 §7-B-2)',
  },
  {
    id: 'company-finyear', label: 'Company / FinYear', groupId: 'masters-admin', route: '/admin/company', arch: 'ST', phase: 'M2',
    description: 'Company profile and financial years.',
    legacyForms: ['FrmCompanyLogin', 'FrmCompanyRights', 'FrmFinyearLogin'],
    agentTools: ['create_fin_year', 'update_fin_year'], pendingTools: [],
    agentPrompt: 'I want to create a financial year',
    notes: 'Admin half lands M6; single-company until then (open decision #1)',
  },
  {
    id: 'options-settings', label: 'Options & Settings', groupId: 'masters-admin', route: '/admin/options', arch: 'ST', phase: 'M6',
    description: 'Global options, print options, dept settings.',
    legacyForms: ['frmOptions', 'FrmOptionsPrint', 'frmDeptSettings'],
    agentTools: ['create_app_option', 'update_app_option', 'list_app_options'], pendingTools: [],
    notes: 'AppOption master grouped print|defaults|general (SPEC-M6 §7-B-2); print.* keys feed getPrintHeader',
  },
  {
    id: 'feature-flags', label: 'Feature Flags', groupId: 'masters-admin', route: '/admin/settings', arch: 'ST', phase: 'M11',
    description: 'The LLD-07 operating switches: tolerances, commercial rules, company config.',
    legacyForms: ['frmOptionsFlags'],
    agentTools: ['list_app_options'], pendingTools: [],
    notes: '28-flag registry board (SPEC-M11): grouped toggles + effect notes + reset-to-default; writes ride POST /api/config → setFlag (admin-only, registry drift-safe); flag:* rows outside the registry render read-only',
  },
  {
    id: 'audit-log', label: 'Audit Log', groupId: 'masters-admin', route: '/admin/audit', arch: 'RG', phase: 'M15',
    description: 'Every committed plan — who, what, when, from which door — the engine-level trail.',
    legacyForms: ['FrmAuditTrail'],
    agentTools: ['get_approval_audit'], pendingTools: [],
    notes: 'SPEC-M9 §9 M15: AuditLog rows written by the runCommit executor at every commit door (agent approve + form actions); admin role door',
  },
]

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
export function isLive(item: MenuItem): boolean {
  return LIVE_ROUTES.has(item.route)
}

export function getHref(item: MenuItem): string {
  return isLive(item) ? item.route : `/coming/${item.id}`
}

export function groupLandingHref(g: MenuGroup): string {
  return LIVE_ROUTES.has(g.landingRoute) ? g.landingRoute : `/coming/${g.id}`
}

export function findItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((i) => i.id === id)
}

export function findGroupById(id: string): MenuGroup | undefined {
  return MENU_GROUPS.find((g) => g.id === id)
}

export function itemsByGroup(groupId: string): MenuItem[] {
  return MENU_ITEMS.filter((i) => i.groupId === groupId)
}

export function findItemByRoute(pathname: string): MenuItem | undefined {
  return MENU_ITEMS.find((i) => i.route === pathname)
}

export function findGroupByLanding(pathname: string): MenuGroup | undefined {
  return MENU_GROUPS.find((g) => g.landingRoute === pathname)
}

/**
 * Group whose ITEM routes match the pathname prefix (e.g. /procurement/grn →
 * procurement group). Used for breadcrumb/active-state when the pathname is an
 * item route rather than a group landing.
 */
export function findGroupByRoutePrefix(pathname: string): MenuGroup | undefined {
  // coming pages resolve through the registry id
  if (pathname.startsWith('/coming/')) {
    const id = pathname.slice('/coming/'.length)
    const group = findGroupById(id)
    if (group) return group
    const item = findItemById(id)
    if (item) return findGroupById(item.groupId)
    return undefined
  }
  // longest matching landing prefix among groups, excluding '/' (home)
  const matches = MENU_GROUPS
    .filter((g) => g.landingRoute !== '/' && pathname.startsWith(g.landingRoute + '/'))
    .sort((a, b) => b.landingRoute.length - a.landingRoute.length)
  if (matches.length > 0) return matches[0]
  // item route exact match → its group
  const item = findItemByRoute(pathname)
  if (item) return findGroupById(item.groupId)
  return undefined
}

/**
 * The rights-enforcement route→group resolver (SPEC-M7 §4 Wave C): deepest
 * item-route match first, then the exact group landing. Returns undefined for
 * meta/utility pages that belong to NO group (/parity, unknown paths) — those
 * stay open to any authenticated user. Used by BOTH the edge middleware and
 * the (erp) layout so the two layers can never disagree.
 */
export function findGroupForPath(pathname: string): MenuGroup | undefined {
  return findGroupByRoutePrefix(pathname) ?? findGroupByLanding(pathname)
}

export function parityStats(): {
  totalItems: number
  liveItems: number
  comingItems: number
  totalGroups: number
  liveGroups: number
  legacyMapped: number
  legacyLive: number
  coveragePct: number
} {
  const liveItems = MENU_ITEMS.filter(isLive).length
  const liveGroups = MENU_GROUPS.filter((g) => LIVE_ROUTES.has(g.landingRoute)).length
  // Set-union so a form claimed by two items counts once (e.g. frmLotApproval).
  // M30: refs run through countableLegacyForms — renames/SQL objects map to
  // their real taxonomy form (dedup by canonical name), and non-form refs
  // (report files, stored procs, our own new-UI inventions) are excluded
  // from the coverage denominator entirely.
  const mapped = new Set<string>()
  const live = new Set<string>()
  for (const i of MENU_ITEMS) {
    countableLegacyForms(i.legacyForms).forEach((f) => mapped.add(f))
    if (isLive(i)) countableLegacyForms(i.legacyForms).forEach((f) => live.add(f))
  }
  const coveragePct = mapped.size === 0 ? 0 : Math.round((live.size / mapped.size) * 1000) / 10
  return {
    totalItems: MENU_ITEMS.length,
    liveItems,
    comingItems: MENU_ITEMS.length - liveItems,
    totalGroups: MENU_GROUPS.length,
    liveGroups,
    legacyMapped: mapped.size,
    legacyLive: live.size,
    coveragePct,
  }
}

