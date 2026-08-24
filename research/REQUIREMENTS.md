# Garment ERP with AI Agent Harness — Requirements

## 1. Background

Source app: **Fiberpro** — a VB.NET Windows Forms garment/textile ERP using SQL Server, Crystal Reports + Stimulsoft. Studied primary source data (SQL triggers, views, report file names, exe.config) — confirms modules covering the full textile value chain (yarn → fabric → trims → cutting → sewing → dispatch → accounting) with Indian GST compliance.

Goal: Build a faithful modern web rebuild as a **Next.js 16** application with a built-in **AI agent harness** that lets users drive the entire ERP through natural-language prompts.

## 2. Functional Modules (16 modules — exact copy of Fiberpro surface)

| # | Module | Entities | Key txn types |
|---|---|---|---|
| 1 | Masters | Buyer, Style, Colour, Size, SizeGroup, Fabric, Yarn (Count), Accessory, Part, Component, Design, Lot, Dia, GSM, UOM, Party (supplier/customer), Godown, Department, Season, Merchandiser, Exporter, Employee | CRUD |
| 2 | Orders / Merchandising | SalesOrder, OrderLine (style×colour×size matrix), OrderDeliverySchedule, OrderAmendment | create, amend, cancel, complete |
| 3 | Procurement | PurchaseRequisition, PurchaseOrder (YarnPO, FabricPO, AccessoryPO, GeneralPO), POLine, GRN (Purchase/Process/DirectReceipt/ProcessReturn/SalesReturn), Supplier | create_po, receive_grn, cancel_po |
| 4 | Inventory | StockLedger (Yarn, Fabric, Accessory, Pieces), Opening, CurrentStock, StockAdjustment, GodownTransfer | opening, purchase_grn, process_delivery, process_receipt, sales_delivery, sales_return, transfer_in, transfer_out, godown_transfer, stock_adjustment_add, stock_adjustment_less |
| 5 | Cutting | CutOrder, CutBundle (with barcode), Marker, LayPlan, CutAck (cutting acknowledgement), ReadyToCut | create_cut_order, issue_fabric, ready_to_cut, cut_ack |
| 6 | Production / Shopfloor | WorkOrder, Operation, BundleTicket, OperatorScan, Line, Shift, WBS_Production_DateWise, WBS_LineProduction, ProdEntry, ProdShiftWages | create_work_order, scan_bundle, post_production, post_shift_wages |
| 7 | Dispatch / Logistics | SalesDelivery, Carton, PackingList, ShippingBill, Container, CourierInvoice | create_shipment, generate_invoice, pack_carton |
| 8 | Pieces (Finished Goods) | PcsDC (Delivery Challan), PcsReceipt, PcsDespatch, PcsTransfer, PcsReturnDC, PcsStockLedger | pcs_despatch, pcs_receipt, pcs_transfer, pcs_return |
| 9 | Jobwork | JobworkOrder, ProcessDelivery (Rule 55 challan), ProcessReceipt, JobworkerInvoice, ITC04Line | send_to_jobworker, receive_from_jobworker, bill_jobwork |
| 10 | Accounting / GST | Bills, BillRate, BillAddded (SGST/CGST/IGST/Others), SalesInvoice, PurchaseInvoice, DebitNote (Acc/Fab/Yarn/Pcs/Comm), Journal, Voucher, PartyLedger, EInvoiceIRN, EWayBill, TDS, Exporter | create_invoice, post_journal, generate_einvoice, generate_eway_bill, raise_debit |
| 11 | Costing & Budgeting | CostingSheet, Budget (BudPoMas/Podet), BudgetVsActual, DailyCostingInputData, ST_Cost_Factory, ST_Cost_OrderDtl, ST_Cost_Dept | create_cost_sheet, create_budget, recost_order |
| 12 | HR & Payroll | Employee, Attendance, Shift, PieceRatePayroll, Overtime, LineIncentive, PF/ESI/PT | mark_attendance, post_piece_rate, post_overtime |
| 13 | Workflow | WorkflowDef, ApprovalStep, ApprovalLog, UserRole, GovtHoliday, WF_PlanFinishDateArrival (skips Sundays + holidays) | submit_for_approval, approve, reject |
| 14 | Barcode | BarcodeMaster, BarcodePrintLog, ScanEvent | print_barcode, scan |
| 15 | Reports | 100+ reports — see Fiberpro/Report folder. Key: OrderSheet, GRN, DC, StockLedger, ClosingStock, CuttingJobOrder, Production, SalesInvoice, Costing, Budget, PartyLedger, Workflow | render_report |
| 16 | Program Balance | ST_ProgBalance_Fabric, ST_ProgBalance_Yarn, ST_Ord_inHand, MR_ProcessDetails — track required vs finished qty per order/dept/fabric | recalculate |

## 3. AI Agent Harness — Architecture

### 3.1 Pattern
**Tool-Calling + Plan-and-Execute + Approval Gates** (per Vercel AI SDK 4.x patterns):
1. User submits prompt → streamed to LLM
2. LLM emits tool calls (`list_orders`, `create_order`, etc.)
3. Read tools execute immediately; **write tools produce a Plan** (dry-run diff)
4. User reviews Plan in chat UI → approves/rejects
5. On approval, write tools commit in a transaction; audit log row written
6. UI revalidates affected paths (`router.refresh()` / `revalidatePath`)

### 3.2 Tool Registry (~40 tools across domains)

**Masters (read+write)**
- `list_buyers`, `get_buyer`, `create_buyer`, `update_buyer`
- `list_styles`, `get_style`, `create_style_with_variants`
- `list_suppliers`, `list_godowns`, `list_departments`
- `list_colours`, `list_sizes`, `list_fabrics`, `list_yarns`, `list_accessories`

**Orders**
- `list_orders`, `get_order`, `create_order` (header + lines matrix), `cancel_order`, `complete_order`, `get_order_status`

**Procurement**
- `list_purchase_orders`, `get_purchase_order`, `create_purchase_order`, `receive_grn`, `cancel_purchase_order`

**Inventory**
- `get_stock` (by godown/dept/item), `get_stock_ledger`, `adjust_stock`, `transfer_stock_godown`, `get_closing_stock`

**Cutting**
- `list_cut_orders`, `get_cut_order`, `create_cut_order`, `issue_fabric_to_cutting`, `mark_ready_to_cut`, `acknowledge_cut`

**Production**
- `list_work_orders`, `get_line_status`, `create_work_order`, `post_production_entry`, `post_shift_wages`

**Dispatch**
- `list_shipments`, `create_shipment`, `generate_sales_invoice`, `create_packing_list`

**Pieces**
- `list_pcs_despatches`, `create_pcs_despatch`, `receive_pcs`, `transfer_pcs`

**Jobwork**
- `send_to_jobworker`, `receive_from_jobworker`, `create_jobworker_invoice`

**Accounting/GST**
- `list_invoices`, `create_sales_invoice`, `post_journal`, `raise_debit_note`, `get_party_ledger`, `get_outstanding`

**Costing**
- `get_cost_sheet`, `create_cost_sheet`, `create_budget`, `get_budget_vs_actual`

**HR**
- `list_employees`, `mark_attendance`, `post_piece_rate_payroll`, `post_overtime`

**Workflow**
- `submit_for_approval`, `approve_step`, `get_pending_approvals`

**Reports**
- `render_report`, `get_dashboard_kpis`

**Meta**
- `summarize_open_orders`, `summarize_stockouts`, `explain_concept` (RAG-style helper for terms)

### 3.3 Safety
- **Confirmation gate** on every write tool (LLM proposes, user approves)
- **Dry-run mode** — write tools return `{ wouldCreate, wouldUpdate, sideEffects }` first
- **Audit log** — every agent turn persisted: prompt, plan, tool calls, results, user decision, committed IDs
- **Idempotency key** per approved plan
- **Role-bounded** — current user role intersects with tool's allowed roles
- **Schema validation** via zod on every tool arg

### 3.4 Streaming UX (shadcn-based chat panel)
- Reasoning tokens stream (collapsible)
- Each tool call = card with name, args (JSON), status pill (pending/running/success/error)
- Inline tool results (collapsible)
- Approval card for mutations with diff preview + Approve/Reject/Edit buttons
- Interrupt button
- Suggested follow-up prompt chips
- Deep links to created records (`/orders/SO-1042`)

## 4. Tech Stack

- **Next.js 16** (App Router, RSC, server actions)
- **TypeScript 5**
- **Tailwind CSS 4 + shadcn/ui**
- **Prisma ORM** with **SQLite** (portable; can swap to Postgres)
- **Vercel AI SDK** (`ai` + `@ai-sdk/openai` packages) for `streamText` + `tool()`
- **zod** for schemas
- **z-ai-web-dev-sdk** for the actual LLM (GLM-4.6) via the AI SDK
- **Sonner** for toasts, **lucide-react** for icons
- **Recharts** for dashboards
- **@hello-pangea/dnd** for matrix-style order entry (optional)

## 5. Data Model Highlights (Prisma)

Core tables: ~50. Sample (full schema in `prisma/schema.prisma`):

- `Party` (suppliers + customers; flag `partyType`)
- `Buyer`, `Season`, `Merchandiser`, `Exporter`
- `Style` (with `StyleVariant` for colour×size×part)
- `Colour`, `Size`, `SizeGroup`, `Part`, `Component`, `Design`, `Lot`, `Dia`
- `Yarn` (Count, blend), `Fabric` (GSM, width, construction), `Accessory`
- `Godown`, `Department`, `Employee`, `UOM`
- `Order` (header), `OrderLine` (matrix), `OrderDeliverySchedule`
- `PurchaseOrder`, `POLine`, `GRN`, `GRNLine`
- `StockLedger` (single ledger with `txnType` enum, `itemType` enum)
- `CurrentStock` (per godown + item)
- `CutOrder`, `CutBundle`, `CutAck`
- `WorkOrder`, `ProductionEntry`, `BundleTicket`, `OperatorScan`
- `SalesInvoice`, `SalesInvoiceLine`, `BillAddDed` (SGST/CGST/IGST)
- `DebitNote`, `Journal`, `Voucher`
- `CostSheet`, `Budget`, `BudgetLine`
- `Workflow`, `ApprovalStep`, `ApprovalLog`
- `AgentTurn` (audit log: prompt, plan, tool calls, result, user, ts)
- `GovtHoliday`
- `ST_ProgBalance_Fabric`, `ST_ProgBalance_Yarn`

## 6. UI Structure

```
/                       → Dashboard (role-based KPI tiles)
/orders                 → Order list
/orders/[id]            → Order detail (matrix view)
/orders/new            → Create order (matrix entry)
/procurement            → PO + GRN list
/inventory              → Stock ledger + closing stock
/inventory/[godown]     → Godown-wise stock
/cutting                → Cut orders + bundles
/production             → Shopfloor dashboard (lines + WIP)
/dispatch               → Shipments + invoices
/pieces                 → Pcs DC + despatch
/jobwork                → Process delivery/receipt
/accounting             → Bills + GST + ledger
/costing                → Cost sheets + budget
/hr                     → Employees + payroll
/masters                → All masters (sub-pages per entity)
/workflow               → Pending approvals
/reports                → Report list + run
/agent                  → AI agent chat (full screen)
```

Layout: left sidebar (modules), top bar (company switcher, search, agent quick-prompt, user menu), main content area. Agent panel slides in from right (`Cmd+K`) — accessible from any page.

## 7. Seed Data

- 1 company (`Baalaji Garments`, Coy code 298)
- 2 godowns (`Main`, `Finished Goods`)
- 6 departments (Knitting, Dyeing, Cutting, Sewing, Finishing, Packing)
- 3 buyers, 5 styles, 6 colours, 5 sizes, 8 fabrics, 5 yarns, 6 accessories
- 4 suppliers, 3 jobworkers
- 5 open sales orders with matrix lines
- 4 POs (2 yarn, 1 fabric, 1 accessory)
- 3 GRNs, 2 cut orders, 1 production entry, 2 invoices, 1 cost sheet
- All needed to demo the agent end-to-end ("create order for buyer X for 5000 pcs…", "show me open POs", "receive GRN for PO 4", "create invoice for order 3", "what's my cutting WIP", "approve pending PO", "give me budget vs actual for order 5")

## 8. Agent Demo Prompts (must all work)

1. "List all open purchase orders"
2. "Show me the stock position in the Main godown"
3. "Create a new sales order for buyer Acme Corp, style S-1001, 5000 pcs (red/M=1000, red/L=1000, blue/M=1500, blue/L=1500), delivery 15 Oct 2026"
4. "What's the WIP on the sewing line for order SO-1001?"
5. "Create a yarn PO for supplier XYZ Yarns for 500 kg of 30s Cotton, rate ₹180/kg, delivery 5 Sep 2026"
6. "Receive a GRN for the last PO with 480 kg actually received"
7. "Raise a sales invoice for order SO-1001 for 2500 pcs at ₹450/pc, IGST 5%"
8. "Show me budget vs actual for order SO-1001"
9. "Approve the pending PO for yarn"
10. "Give me today's shopfloor dashboard summary"

## 9. Out of Scope (v1)

- Actual barcode printing (just generate barcode strings)
- Crystal/Stimulsoft report rendering (use HTML/Recharts equivalents)
- Real e-invoice/e-way bill NIC portal integration (mock the IRN)
- Real biometric attendance (manual entry)
- Multi-tenant isolation (single tenant, but `coyCode` field preserved)

## 10. Success Criteria

- All 16 module pages render with seed data
- Agent chat can perform all 10 demo prompts successfully
- Every mutation goes through approval gate
- Audit log captures every agent turn
- UI revalidates after each committed mutation
- App runs in `npm run dev` and is previewable
