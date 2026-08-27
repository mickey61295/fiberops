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

export type Archetype = 'DB' | 'MT' | 'DS' | 'RG' | 'IN' | 'RH' | 'ST'
export type Phase = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6'

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
  '/accounts/bills-register', // Bills Register (M4 Wave B) — bills-register
  '/accounts/supplier-bills', // Supplier Bill Register (M4 Wave B) — supplier-bill-register
  '/accounts/party-ledger', // Party Ledger (M4 Wave B) — party-ledger
  '/costing/budget-vs-actual', // Budget vs Actual (M4 Wave B) — budget-vs-actual
  '/approvals/audit', // Approval Audit Trail (M4 Wave B) — approval-audit-trail
  '/orders/status', // Order Status Board (M4 Wave C) — order-status-board
  '/accounts', // InvoicesView
  '/costing', // CostingView
  '/hr', // HrView
  '/masters', // MasterTable hub (M2) — 24 config-driven entity screens
  '/admin/company', // Company / FinYear (M2) — company-finyear menu item
  '/approvals', // WorkflowView — Approval Inbox shell
  '/parity', // parity tracker page
  '/coming', // prefix for dynamic coming-soon pages
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
  { id: 'dispatch', label: 'Dispatch & Logistics', icon: 'Truck', landingRoute: '/coming/dispatch', order: 10, description: 'DCs (all materials), gate, courier, loading' },
  { id: 'accounts', label: 'Accounts & GST', icon: 'Receipt', landingRoute: '/accounts', order: 11, description: 'Invoices, bills, payments, journals, HSN' },
  { id: 'costing', label: 'Costing & Budgets', icon: 'Calculator', landingRoute: '/costing', order: 12, description: 'Cost sheets, budgets, expenses, P&L' },
  { id: 'hr', label: 'HR & Payroll', icon: 'Users', landingRoute: '/hr', order: 13, description: 'Employees, shifts, wages' },
  { id: 'quality', label: 'Quality & Lab', icon: 'FlaskConical', landingRoute: '/coming/quality', order: 14, description: 'Lab tests, parameters, approvals' },
  { id: 'approvals', label: 'Approvals & Workflow', icon: 'CheckCircle2', landingRoute: '/approvals', order: 15, description: 'Cross-module approval inbox + audit' },
  { id: 'reports', label: 'Reports & Analytics', icon: 'BarChart3', landingRoute: '/coming/reports', order: 16, description: 'Report hub, packs, MIS' },
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
// ITEMS (113) — SPEC-M1 §5.2
// ---------------------------------------------------------------------------
export const MENU_ITEMS: MenuItem[] = [
  // ---- home (3) ----
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
  },
  {
    id: 'order-close', label: 'Order Close', groupId: 'orders', route: '/orders/close', arch: 'DS', phase: 'M3',
    description: 'Close an order once shipped & billed; blocks further entries.',
    legacyForms: ['FrmOrderClose'],
    agentTools: [], pendingTools: ['close_order'],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'commercial-invoice', label: 'Commercial Invoice', groupId: 'orders', route: '/orders/commercial-invoice', arch: 'DS', phase: 'M5',
    description: 'Export commercial invoice for an order shipment.',
    legacyForms: ['FrmCommericalInv_New', 'FrmInvComm'],
    agentTools: [], pendingTools: [],
  },

  // ---- programs (5) ----
  {
    id: 'program-entry', label: 'Program Entry', groupId: 'programs', route: '/programs/new', arch: 'DS', phase: 'M3',
    description: 'Program an order: yarn/fabric requirements with kgs/mtrs/pcs.',
    legacyForms: ['frmProgEntry', 'frmProgNew', 'frmProgEntry_Actual', 'frmProgEntry_YarnCons'],
    agentTools: ['create_program'], pendingTools: [],
    agentPrompt: 'I want to create a program for an order',
  },
  {
    id: 'program-status', label: 'Program Status', groupId: 'programs', route: '/programs/status', arch: 'RG', phase: 'M3',
    description: 'Program balances: required vs achieved per order — the operator\u2019s compass.',
    legacyForms: ['ST_ProgBalance_Yarn', 'ST_ProgBalance_Fabric'],
    agentTools: ['get_program_status'], pendingTools: [],
    agentPrompt: 'Show me program balances and pending requirements',
    notes: 'Legacy family ST_ProgBalance_*',
  },
  {
    id: 'program-cancel', label: 'Program Cancel', groupId: 'programs', route: '/programs/cancel', arch: 'DS', phase: 'M3',
    description: 'Cancel a program (accounting-aware, with approval).',
    legacyForms: ['frmProgCancel', 'FrmAcc_ProgCancel', 'frmProgCancel_Compwise'],
    agentTools: [], pendingTools: ['cancel_program'],
  },
  {
    id: 'program-complete', label: 'Program Complete', groupId: 'programs', route: '/programs/complete', arch: 'DS', phase: 'M3',
    description: 'Mark a program complete; settles balances.',
    legacyForms: ['FrmProgramComplete'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'fabric-acc-allotment', label: 'Fabric / Acc Allotment', groupId: 'programs', route: '/programs/allotment', arch: 'DS', phase: 'M5',
    description: 'Allot fabric/accessories combo-wise against programs.',
    legacyForms: ['frmFabricAllotment', 'frmComboWiseReqRpt'],
    agentTools: [], pendingTools: [],
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
    agentTools: ['cancel_purchase_order'], pendingTools: [],
    agentPrompt: 'I want to cancel a purchase order',
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'grn-acceptance', label: 'GRN Acceptance', groupId: 'procurement', route: '/procurement/grn/acceptance', arch: 'IN', phase: 'M3',
    description: 'Accept/reject received goods (purchase & process GRN queue).',
    legacyForms: ['FrmPurGrnAccept', 'FrmProGrnAccept'],
    agentTools: ['approve_pending'], pendingTools: [],
    agentPrompt: 'Show me pending approvals',
  },
  {
    id: 'supplier-orders', label: 'Supplier Orders', groupId: 'procurement', route: '/procurement/supplier-orders', arch: 'DS', phase: 'M5',
    description: 'Semi-finished supplier order sheets & tech packs.',
    legacyForms: ['FrmSuppOrdSheet_Semi', 'FrmSuppProdSequence', 'FrmSuppTechDataSheet'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'rate-confirmation', label: 'Rate Confirmation', groupId: 'procurement', route: '/procurement/rate-confirmation', arch: 'RG', phase: 'M5',
    description: 'Confirm yarn/fabric/accessory rates before billing.',
    legacyForms: ['RptYarnRateConfirm', 'RptFabRateConfirm', 'RptAccRateConfirm'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'party-balance', label: 'Party Balance', groupId: 'procurement', route: '/procurement/party-balance', arch: 'RG', phase: 'M4',
    description: 'Party-wise PO balances: ordered vs received vs pending.',
    legacyForms: ['FrmPartyBlnc', 'Sp_POBalnce'],
    agentTools: ['get_party_ledger'], pendingTools: [],
    agentPrompt: 'Show me party balances and pending POs',
  },

  // ---- inventory (9) ----
  {
    id: 'stock-view', label: 'Stock View (live)', groupId: 'inventory', route: '/inventory/stock', arch: 'RG', phase: 'M2',
    description: 'Live current stock by item/godown — yarn, fabric, accessories, pieces.',
    legacyForms: ['frmStockView', 'frmfabstockshow', 'frmYarnStockShow', 'frmAccStockShow', 'frmAccShort'],
    agentTools: ['get_stock'], pendingTools: [],
    agentPrompt: 'Show me current stock',
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
    id: 'opening-stock', label: 'Opening Stock', groupId: 'inventory', route: '/inventory/opening-stock', arch: 'DS', phase: 'M2',
    description: 'Set opening balances when onboarding a godown/item.',
    legacyForms: ['frmOpeningStock', 'frmOpeningStock_CompWise', 'frmPcsStagewiseOpeningStock'],
    agentTools: [], pendingTools: ['post_opening'],
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
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: ['issue_fabric_to_cut'],
  },
  {
    id: 'ready-to-cut', label: 'Ready to Cut', groupId: 'cutting', route: '/cutting/ready-to-cut', arch: 'DS', phase: 'M3',
    description: 'Move program stock into the ready-to-cut virtual department.',
    legacyForms: ['frmReadytoCut'],
    agentTools: [], pendingTools: ['ready_to_cut'],
    notes: 'Legacy virtual dept -7; named enum arrives with legacy-enums.ts (M2)',
  },
  {
    id: 'cutting-production', label: 'Cutting Production', groupId: 'cutting', route: '/cutting/production', arch: 'DS', phase: 'M3',
    description: 'Post cut panel output (G1 pieces).',
    legacyForms: ['FrmCuttingProduction_Auto_New'],
    agentTools: ['post_production_entry'], pendingTools: [],
    agentPrompt: 'I want to post cutting production',
  },
  {
    id: 'cutting-ack', label: 'Cutting Ack', groupId: 'cutting', route: '/cutting/ack', arch: 'IN', phase: 'M3',
    description: 'Acknowledge issued fabric reached cutting.',
    legacyForms: ['frmcuttingack'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'panel-cutting', label: 'Panel Cutting / Add', groupId: 'cutting', route: '/cutting/panel', arch: 'DS', phase: 'M5',
    description: 'Add/adjust panel cutting entries.',
    legacyForms: ['frmAddPanelCutting'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'panel-production', label: 'Panel Production', groupId: 'cutting', route: '/cutting/panel-production', arch: 'DS', phase: 'M5',
    description: 'Panel-wise production entries.',
    legacyForms: ['frmProduction_CutPanel'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'fabric-rejection-return', label: 'Fabric Rejection Return', groupId: 'cutting', route: '/cutting/fab-rejection', arch: 'DS', phase: 'M5',
    description: 'Return rejected fabric from cutting to store.',
    legacyForms: ['FrmCutting_FabRej', 'FrmCuttingfabretreg'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
    notes: 'GAN semantics — PITFALLS #12',
  },
  {
    id: 'pcs-transfer', label: 'Pcs Transfer', groupId: 'pieces', route: '/pieces/transfer', arch: 'DS', phase: 'M3',
    description: 'Transfer finished pieces between godowns/units.',
    legacyForms: ['FrmPcsGodTransfer'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'pcs-stock', label: 'Pcs Stock', groupId: 'pieces', route: '/pieces/stock', arch: 'RG', phase: 'M4',
    description: 'Finished goods stock incl. rejected pieces.',
    legacyForms: ['FrmPieceStock', 'FrmPieceStock_All', 'FrmRejPieceStock'],
    agentTools: ['get_stock'], pendingTools: [],
    agentPrompt: 'Show me finished goods (pcs) stock',
  },
  {
    id: 'finished-goods-entry', label: 'Finished Goods Entry', groupId: 'pieces', route: '/pieces/finished-goods', arch: 'DS', phase: 'M5',
    description: 'Enter finished goods into FG store.',
    legacyForms: ['FrmFinishGoodsEntry'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'packing-list', label: 'Packing List', groupId: 'pieces', route: '/pieces/packing-list', arch: 'DS', phase: 'M5',
    description: 'Carton-wise packing list per despatch (solid/assorted).',
    legacyForms: ['FrmPackingList', 'FrmPackingList_Domestic', 'FrmLocalInvPackingList', 'FrmPackingList_Solid'],
    agentTools: [], pendingTools: [],
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
    id: 'line-output', label: 'Line Output', groupId: 'production', route: '/production/line-output', arch: 'DS', phase: 'M3',
    description: 'Record line output (manual entry).',
    legacyForms: ['frmLineOutputManual', 'frmLineOutputManual_New'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'line-status', label: 'Line Status / WIP', groupId: 'production', route: '/production/line-status', arch: 'DB', phase: 'M3',
    description: 'Live WIP per line: issued vs produced vs pending.',
    legacyForms: [],
    agentTools: ['get_line_status'], pendingTools: [],
    agentPrompt: 'Show me line status and WIP',
    notes: 'Legacy used EmpID-as-LineID trick',
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
    agentTools: [], pendingTools: ['scan_bundle'],
  },
  {
    id: 'line-transfer', label: 'Line Transfer', groupId: 'production', route: '/production/line-transfer', arch: 'DS', phase: 'M5',
    description: 'Move WIP between sewing lines.',
    legacyForms: ['Trs_LineTfr'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'operation-entry', label: 'Operation Entry', groupId: 'production', route: '/production/operations', arch: 'DS', phase: 'M5',
    description: 'Sub-process/operation-wise entries.',
    legacyForms: ['FrmOperationEntry', 'Frm_SubProcess'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
  },

  // ---- dispatch (8) ----
  {
    id: 'dc-entry', label: 'Fabric/Yarn/Acc/Gen DC', groupId: 'dispatch', route: '/dispatch/dc', arch: 'DS', phase: 'M3',
    description: 'Delivery challans for material going out (process/jobwork).',
    legacyForms: ['FrmFabDel', 'FrmAccDel', 'FrmGenDC', 'FrmYarnDel'],
    agentTools: [], pendingTools: ['create_dc'],
    notes: 'Also Yarn DC variants',
  },
  {
    id: 'process-dc', label: 'Process DC (multi)', groupId: 'dispatch', route: '/dispatch/dc/process', arch: 'DS', phase: 'M3',
    description: 'Multi-component process delivery challans.',
    legacyForms: ['frmPrsDelMulti', 'frmPrsDelMulti_Acc', 'frmPrsDelMulti_Compwise'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'dc-return', label: 'DC Return', groupId: 'dispatch', route: '/dispatch/dc-return', arch: 'DS', phase: 'M3',
    description: 'Return unsent/rejected material against a DC.',
    legacyForms: ['FrmAccDel_Return', 'FrmFabDel_Return', 'RPtFabDcRet'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'gate-entry', label: 'Gate Entry', groupId: 'dispatch', route: '/dispatch/gate-entry', arch: 'DS', phase: 'M5',
    description: 'Vehicle/visitor gate log for incoming material.',
    legacyForms: ['FrmGateEntry', 'FrmDirectBill_GateEntry'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'gate-pass', label: 'Gate Pass', groupId: 'dispatch', route: '/dispatch/gate-pass', arch: 'DS', phase: 'M5',
    description: 'Gate pass for outgoing material/vehicles.',
    legacyForms: ['FrmGatePass'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'unit-transfer-ack', label: 'Unit Transfer Ack', groupId: 'dispatch', route: '/dispatch/unit-transfer-ack', arch: 'IN', phase: 'M5',
    description: 'Acknowledge inter-unit transfers.',
    legacyForms: ['FrmUnitTransferAck'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'courier-dc', label: 'Courier DC', groupId: 'dispatch', route: '/dispatch/courier', arch: 'DS', phase: 'M6',
    description: 'Courier despatch challans (samples/documents).',
    legacyForms: ['CourierDC'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'loading', label: 'Loading', groupId: 'dispatch', route: '/dispatch/loading', arch: 'DS', phase: 'M6',
    description: 'Loading/challan consolidation for shipment.',
    legacyForms: ['FrmLoading'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'piece-jobwork-invoice', label: 'Piece / Jobwork Invoice', groupId: 'accounts', route: '/accounts/invoice/piece', arch: 'DS', phase: 'M5',
    description: 'Piece-rate and jobwork invoicing.',
    legacyForms: ['frmPieceInv', 'frmPieceInv_1', 'Rpt_JobwrkInvoice'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'debit-note', label: 'Debit Note', groupId: 'accounts', route: '/accounts/debit-note', arch: 'DS', phase: 'M3',
    description: 'Debit notes to parties (rate diff, rejection, claims).',
    legacyForms: ['frmdebitnote', 'frmDirectDebitNote'],
    agentTools: ['create_debit_note'], pendingTools: [],
    agentPrompt: 'I want to raise a debit note',
  },
  {
    id: 'bill-pass', label: 'Bill Pass', groupId: 'accounts', route: '/accounts/bill-pass', arch: 'IN', phase: 'M5',
    description: 'Approve supplier bills for payment.',
    legacyForms: ['frmBillPass'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'hsn-gst-setup', label: 'HSN / GST Setup', groupId: 'accounts', route: '/accounts/hsn-gst', arch: 'ST', phase: 'M2',
    description: 'HSN codes and GST rates per item.',
    legacyForms: ['FrmHSN', 'FrmHSNPce', 'FrmTally_GSTSetup'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
    notes: 'Also multi-level daily variants',
  },
  {
    id: 'budget', label: 'Budget', groupId: 'costing', route: '/costing/budget', arch: 'DS', phase: 'M5',
    description: 'Jobwork/production budgets and pre-budget plans.',
    legacyForms: ['frmBudget', 'frmBudgetNew_JobWork', 'frmPreBudgetProdPlan'],
    agentTools: [], pendingTools: ['create_budget'],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'daily-unit-pnl', label: 'Daily Unit P&L', groupId: 'costing', route: '/costing/daily-pnl', arch: 'RH', phase: 'M6',
    description: 'Daily profit & loss per unit.',
    legacyForms: ['Sp_DailyUnitPANDL'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'piece-rate-confirmation', label: 'Piece-Rate Confirmation', groupId: 'costing', route: '/costing/piece-rate', arch: 'RH', phase: 'M5',
    description: 'Confirm piece rates before wage billing.',
    legacyForms: ['RptPieceRateConfirm', 'RptPieceRateConfirm_InHouse'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'production-wages', label: 'Production Wages', groupId: 'hr', route: '/hr/wages', arch: 'DS', phase: 'M5',
    description: 'Wage computation from production (dept/stage-wise).',
    legacyForms: ['Frm_ProductionWages', 'Frm_ProductionWages_Dept', 'Frm_ProductionWages_Stage'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'wage-payments', label: 'Wage Payments', groupId: 'hr', route: '/hr/wage-payments', arch: 'DS', phase: 'M5',
    description: 'Pay wages; settlements per employee/unit.',
    legacyForms: ['FrmPaymentReg_Wages'],
    agentTools: [], pendingTools: [],
  },

  // ---- quality (5) ----
  {
    id: 'lab-test-entry', label: 'Lab Test Entry', groupId: 'quality', route: '/quality/lab-tests', arch: 'DS', phase: 'M5',
    description: 'Record fabric/yarn lab test results.',
    legacyForms: ['FrmLabTest', 'FrmNewLabTest'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'test-parameters', label: 'Test Parameters / Stages', groupId: 'quality', route: '/quality/parameters', arch: 'MT', phase: 'M2',
    description: 'Lab test parameters and stage definitions.',
    legacyForms: ['FrmLabTestParameters', 'FrmLabTestParameters_Stages', 'FrmLabTestParameters_InputParameters'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'lot-approval', label: 'Lot Approval', groupId: 'quality', route: '/quality/lot-approval', arch: 'IN', phase: 'M3',
    description: 'Approve dyeing/knitting lots into stock.',
    legacyForms: ['frmLotApproval'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'reprocess-approval', label: 'Reprocess Approval', groupId: 'quality', route: '/quality/reprocess-approval', arch: 'IN', phase: 'M5',
    description: 'Approve reprocessing of defective material.',
    legacyForms: ['FrmReprocess_Approval'],
    agentTools: [], pendingTools: [],
  },
  {
    id: 'non-return-dc-approval', label: 'Non-Return DC Approval', groupId: 'quality', route: '/quality/non-return-dc', arch: 'IN', phase: 'M5',
    description: 'Approve DCs whose material will not return.',
    legacyForms: ['FrmNonReturnDCApproval'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: ['render_report'],
    notes: '491 report files dedup to ~80 unique outputs (plan §1.2)',
  },
  {
    id: 'report-packs', label: 'Order / Production / Inventory / Accounts packs', groupId: 'reports', route: '/reports/packs', arch: 'RH', phase: 'M6',
    description: 'Domain-wise report packs.',
    legacyForms: [],
    agentTools: [], pendingTools: [],
    notes: 'Domain .rpt/.mrt sets',
  },
  {
    id: 'mis-dashboard', label: 'MIS Dashboard', groupId: 'reports', route: '/reports/mis', arch: 'DB', phase: 'M6',
    description: 'Management information dashboards.',
    legacyForms: ['frmMIS', 'FrmMISSetting'],
    agentTools: [], pendingTools: [],
  },

  // ---- masters-admin (5) ----
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
    agentTools: [], pendingTools: [],
  },
  {
    id: 'menu-rights', label: 'Menu Rights', groupId: 'masters-admin', route: '/admin/menu-rights', arch: 'ST', phase: 'M6',
    description: 'Which group sees which menu items.',
    legacyForms: ['FrmMenuRights', 'FrmMenuAccRights'],
    agentTools: [], pendingTools: [],
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
    agentTools: [], pendingTools: [],
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
  const mapped = new Set<string>()
  const live = new Set<string>()
  for (const i of MENU_ITEMS) {
    i.legacyForms.forEach((f) => mapped.add(f))
    if (isLive(i)) i.legacyForms.forEach((f) => live.add(f))
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

