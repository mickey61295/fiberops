# Fiberpro Web ERP + AI Agentic Harness — Requirements Specification

## 1. Background & Research Summary

### 1.1 Reverse-engineered source (Fiberpro desktop ERP)

The original artifact distributed via Google Drive (`1wImin-ytRObVfVJUKeg4zngdfc4ydgdY`, 114 MB) is the
production build of a VB.NET Windows Forms garment/textile ERP called **Fiberpro**, targeted at
knitted-garment exporters. The deployed binary (`Fiberpro.exe`, 158 MB) plus `Fiberpro Library.dll`,
`FReportConfig.dll`, `Fiberpro_ReportLibrary.dll`, Stimulsoft & Crystal Reports runtime DLLs, and a
SQL Server backend (293 stored procedures in `SPQuery/`, 62 triggers in `SPTriggers/`, 16 views in
`SPViews/`) constitute the system. Report templates alone number ~250 `.rpt` / `.mrt` files.

The desktop UI is organized around the standard textile export workflow:

1.  Sales order entry (buyer order → style → size/color matrix → delivery dates)
2.  Yarn purchase (PO → GRN → stock → issue to knitting)
3.  Knitting program (yarn → fabric rolls)
4.  Multi-stage wet processing: Heat Setting → Washing → Compacting (each with delivery challan + GRN)
5.  Fabric delivery to cutting
6.  Cutting (panel production, bundle barcodes)
7.  Sewing / assembly (piece production, rework, rejection)
8.  Accessories procurement (PO → GRN → DC → issue to line)
9.  Despatch (pieces DC → sales invoice)
10. Commercial bills, party balance, debit notes, and trade commission
11. WBS (Work Breakdown Structure) production tracking by line & date
12. Costing (budget vs actual, daily costing input data)
13. Meetings / merchandising review

### 1.2 Domain data model extracted from SQL artifacts

**Master tables (`Mas_*`)** identified via `Trg_Mas_*` triggers and stored procedures:

| Master              | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Mas_Buyer           | Buyer master with `ShortBuyer`, `BuyerName`, `BuyerID`             |
| Mas_BuyerDept       | Buyer-side department                                              |
| Mas_Merchandiser    | Internal merchandiser owning buyer relationship                   |
| Mas_Party           | Supplier / processor (yarn, fabric, accessories, job-work)        |
| Mas_Exporter        | Exporter entity (also used as production unit `MasFactory`)       |
| Mas_StyleDesc       | Style master with `StyleID`, `StyleDesc`                          |
| Mas_Stylegroup      | Style grouping                                                     |
| Mas_Design          | Design master                                                      |
| Mas_Fabric          | Fabric master (knitted, woven)                                     |
| Mas_Color           | Color master                                                       |
| Mas_Size / SizeGroup | Size matrix                                                       |
| Mas_Component       | Garment component (body, sleeve, collar, etc.)                    |
| Mas_Part            | Pattern part                                                       |
| Mas_Count           | Yarn count (Ne, Nm)                                                |
| Mas_Dia             | Knitting machine diameter                                          |
| Mas_Lot             | Lot master                                                         |
| Mas_Acc / AccCategory / AccDes | Accessories master + category + design                |
| Mas_Dept            | Department master (ids: Knitting=4,43; Heat=5; Wash=7,19,41,42; Compact=9,18,28,40,44,45,46; etc.) |
| Mas_Emp             | Employee                                                           |
| Mas_Fcy             | Foreign currency + `ExchangeRate`                                 |
| Mas_UOM             | Unit of measure (Kg, Pcs, Mtr, Roll, Bundle)                       |
| Mas_Season          | Fashion season                                                     |
| Mas_JobWrkComp      | Job-work component                                                 |

**Transactional tables** extracted from `SP_Vue_OrderinHand`, `Sp_POBalnce`, `SP_OrderStatus`:

| Table                          | Role                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| OrderMas                       | Order header: `OrdId`, `JobNo`, `Finyear`, `BuyOrdNo`, `BuyordDt`, `OrdDate`, `BuyerID`, `MerchID`, `ExpID`, `OrderQty`, `OrderType`, `grpref`, `Completed`, `Fcy`, `Crate`, `SaleRate` |
| OrderMas2                      | Extension: `Season1`, `DelDt`, `ActDelDt`, `Gsm`, `FwdCtRate`             |
| OrderStyleDtl                  | Style breakdown per order: `StyleNo`, `StyleId`, `uom`, `Fabric1`, `EntryOption` (1 = size-wise, 2 = combo-color-wise), `DelDt` |
| OrderQtyDtl                    | Size-wise quantity matrix: `OrdID`, `StyleNo`, `StyleId`, `ColID`, `SizeId`, `LotNo`, `OrderQty`, `SaleRate`, `ProdUnit`, `Deldt` |
| OrdQtyClrDtl                   | Combo-color-wise quantity matrix: `CmbClrID` instead of `ColID`            |
| StockTable                     | Unified stock master: `StockID`, `OrdID`, `FabID`, `CntID`, `ColID`, `SizeId`, `LotNo`, `YF` (yarn-flag), `Kg`/`Pcs`, `Roll` |
| Trs_Del1 / Trs_Del2 / Trs_Del3 | Delivery Challan header/line/detail — yarn & fabric issue to processing   |
| Trs_GRN1 / Trs_GRN2            | GRN header/line — receives back from process; `GRNType ∈ {Process, Process Return}` |
| Trs_MultiPrs_Grn1/2/3          | Multi-process GRN (combined Heat+Wash+Compact single DC)                 |
| ST_PartyBalance_Abs            | Per-`OrdID`×`Style`×`Dept`×`Party`×`DCNo` balance: `DCQty`, `GrnQty`, `DcBgRl`, `GrnBgRl`, `DcMtr`, `GrnMtr` |
| ST_ProdBalance_Yarn / Fabric   | Program-vs-actual balance                                                 |
| ST_Acc_Prog_Balance            | Accessories program balance                                              |
| ST_Ord_inHand                  | Order-in-hand snapshot                                                    |
| ST_Cost_Dept / Cost_Factory / Cost_OrderDtl | Costing aggregates                                       |
| ST_DailyCostingInputData       | Daily costing inputs                                                     |
| BillsReg                       | Bills register (one row per dept type: yarn/fab/prd/acc/cm)               |
| PcsProd (Sp_Pcs2, PcsGrn2)     | Cutting & sewing piece production                                         |
| WBS_Production / WBS_Line_Production | Work-breakdown line production tracking                            |

### 1.3 Independent research on AI agentic harnesses

An **agentic harness** is a software layer that lets a single LLM receive a natural-language goal,
autonomously plan a sequence of operations, execute them against real backend APIs, observe results,
and continue iterating until the goal is achieved or it asks the human for clarification. The four
established architectural patterns are:

1. **ReAct loop** (Reason → Act → Observe) — described by Yao et al. (2022). The model emits a
   Thought, then an Action (tool call), observes the Observation, and repeats. Used by LangChain
   `AgentExecutor`.
2. **Function-calling loop** — OpenAI / Anthropic native tool-use. The model emits a structured
   JSON tool call; the harness executes and feeds back a `tool` role message. This is now the
   dominant pattern because of strict-schema JSON output and reduced hallucination.
3. **Plan-and-Execute / LangGraph state machines** — first plan a multi-step DAG, then execute
   each node. Suitable for long-horizon workflows like "Create an order for 5,000 pcs across two
   colors and check stock coverage".
4. **Multi-agent orchestration** — CrewAI / AutoGen / OpenAI Swarm: specialized agents
   (Planning, Retrieval, Execution, Verification) pass tasks to each other.

For ERP control the key design decisions are:

- **Tool registry** exposing every entity CRUD + every business operation (create order, post GRN,
  check stock, post invoice, run report). Each tool declares a JSON-Schema so the LLM cannot produce
  syntactically invalid calls.
- **Read-only vs write tools** — read tools (query/list/get) execute immediately; write tools
  (create/update/delete/post) require confirmation by default and can be rolled back via a
  "preview → confirm → commit" pattern.
- **Business-rule guard rails** — agent cannot, e.g., despatch more pieces than were produced.
  Constraints are enforced server-side regardless of LLM intent.
- **Context window discipline** — for a 50K-row stock table the agent must call list tools with
  filters and receive paginated summaries (not full dumps). The harness wraps every result with
  a "context budget" hint.
- **Audit log** — every tool call, LLM prompt, and tool response is persisted with actor, timestamp,
  before/after state for compliance and undo.
- **Streaming UX** — user sees the agent's reasoning steps and tool calls in real time, similar to
  Claude's artifact stream or ChatGPT's function-call bubble.

Reference architectures we will adopt: LangGraph's "supervisor + workers" pattern, Anthropic's MCP
(Model Context Protocol) tool-definition convention, and OpenAI's strict-mode function calling.

## 2. Functional Requirements

### 2.1 Module coverage (must match original Fiberpro)

The web copy MUST replicate the following modules. Each is a top-level sidebar entry.

1. **Dashboard** — KPI tiles: Orders in hand, Yarn stock (kg), Fabric stock (kg), Pcs stock,
   Pending deliveries, Party outstanding, Production today.
2. **Masters**
   - Buyer, Buyer Dept, Merchandiser, Exporter, Factory
   - Party (Supplier), Employee, Department
   - Style, Style Group, Design, Season
   - Fabric, Color, Size, Size Group, Component, Part
   - Yarn Count, Knitting Dia, Lot
   - Accessories, Acc Category, Acc Design
   - Foreign Currency, UOM
3. **Sales Orders** — OrderMas header + per-style breakdown + size/color matrix
4. **Yarn** — PO, GRN, DC (issue), Returns
5. **Knitting Program** — Yarn → Fabric program with `Prog` qty per style/fabric/color
6. **Fabric** — Process DCs (Heat, Wash, Compact), Multi-process GRN, Fabric stock
7. **Cutting** — Panel production, Bundle barcode
8. **Sewing / Pieces** — Pcs production, Pcs rejection, Pcs GRN, Pcs DC
9. **Accessories** — PO, GRN, DC, Issue to line
10. **Despatch** — Pcs Despatch, Sales Invoice
11. **Bills** — Bills Register, Party Balance, Outstanding, Debit Notes
12. **Costing** — Budget vs Actual, Daily Costing Input
13. **WBS Production** — Line-wise production tracking
14. **Meetings / Merchandising Review**
15. **Reports** — Order status, Order-in-hand, Production consolidate, Stock ledger,
    Party balance, Sales invoice, Order sheet, Cutting job order, Bundle barcode, etc.
16. **AI Console** — the agentic harness chat

### 2.2 Per-module capabilities

For every master: list (with search & filter), create, update, soft-delete, view history.
For every transactional module: register (header + multi-row detail), approve/post, cancel,
print preview (browser print), list, edit before posting.

### 2.3 Cross-cutting

- Multi-financial-year (`Finyear`) with year-end roll-over trigger mirror (`Trg_Finyear_Update`)
- Stock posting rules implemented server-side (mirror `Trg_CurrentStock_Update`,
  `Trg_ST_ProgBalance_*`, `Trg_ST_Production_Data_Update`)
- Party balance abstraction (`Sp_POBalnce` semantics): each DC + GRN updates a per-order×style×
  dept×party×dc-no balance row
- Trigger-on-update `UpdateFlg` is preserved as a `updatedAt` + `syncPending` flag on every master

## 3. AI Agentic Harness Requirements

### 3.1 Tool registry (minimum viable tool set)

The harness MUST expose the following tool groups. Each tool is a TypeScript function with a
JSON-Schema description consumed by the LLM.

**Query tools (read-only, no confirmation)**
- `list_orders` (filters: buyerId, styleNo, season, status, dateRange) → paginated summary
- `get_order_detail` (ordId) → full order with style & size/color matrix
- `list_stock` (filters: yarn|fabric|pieces, ordId, fabId, colId, lotNo) → stock balances
- `list_buyers`, `list_suppliers`, `list_styles`, `list_fabrics`, `list_colors`, `list_sizes`
- `get_party_balance` (ordId, partyId, deptId) → balance row
- `get_order_in_hand` (filters) → order-in-hand report
- `search_master` (entity, query) → fuzzy search
- `get_kpis` → dashboard snapshot
- `run_report` (reportName, params) → structured + HTML result

**Write tools (confirmation required by default)**
- `create_order` (buyerId, merchId, expId, fcy, orderType, styles[{styleId, fabric, sizes[{colId, sizeId, qty, saleRate, deldt}]}])
- `update_order` (ordId, patch)
- `cancel_order` (ordId, reason)
- `create_yarn_po` (partyId, ordId, lines[{cntId, qty, rate, uom}])
- `post_grn` (poId, lines[{stockId, recQty, rollNo}])
- `post_dc` (type: yarn|fabric|acc|pcs, fromDept, toDept, lines[{stockId, qty}])
- `post_multi_process_grn` (dcId, processes[])
- `create_knitting_program` (ordId, fabId, cntId, colId, progQty)
- `post_cutting_production` (ordId, styleNo, panels[{partId, sizeId, qty}])
- `post_pcs_production` (ordId, styleNo, prodUnit, lines[{sizeId, qty, rework, rejection}])
- `post_despatch` (ordId, styleNo, lines[{sizeId, qty}])
- `create_sales_invoice` (despatchIds[], otherCharges[])
- `post_bill` (partyId, type, dcIds[], amount)
- `apply_debit_note` (partyId, type, amount, reason)
- `create_meeting` (title, attendees[], decisions[])
- `update_meeting_posting` (meetingId, actionItems[])

**Workflow tools (multi-step, preview first)**
- `plan_order_fulfillment` (ordId) → returns recommended yarn qty, knitting plan, fabric plan, cutting plan
- `plan_procurement` (ordId, item) → returns recommended PO qty vs stock

### 3.2 Agent loop

```
1. user prompt + system prompt (tool catalog + business rules)
2. LLM emits: {thought, tool_calls[]}
3. harness validates each tool_call against schema
4. read tools run immediately; write tools run in "dry-run" preview mode
5. harness returns observation JSON to LLM (with context-budget hints)
6. LLM emits next thought/tool_calls OR final_answer
7. on `final_answer` with write operations pending, harness asks user to confirm
8. on confirm, write tools commit; on reject, harness asks LLM to replan
```

### 3.3 Safety & UX

- Every write call shows: entity, op, before-state, after-state, business-rule violations (if any).
- An "Undo" action reverses the last committed transaction group using the audit log.
- An "Approve all" toggle for trusted power users skips per-call confirmation but keeps the audit log.
- The agent's tool-call stream is rendered live (like Claude's reasoning + tool bubbles).
- A "Dry run" toggle forces the agent to only call read tools.

## 4. Non-Functional Requirements

- **Stack**: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + SQLite (for
  the demo; same schema ports to Postgres for production).
- **AI runtime**: `z-ai-web-dev-sdk` GLM-4 chat for the agent LLM; tool-use via JSON mode.
- **Persistence**: every entity table mirrors the Fiberpro naming convention (`Mas_*`, `Trs_*`,
  `ST_*`, `OrderMas`, `StockTable`, etc.) so a future data migration from SQL Server is mechanical.
- **Seed**: realistic sample data — 2 buyers, 3 styles, 1 order with size/color matrix, sample
  stock, sample DC/GRN, sample Pcs production.
- **Performance**: every list view paginated 25/page; agent tool result size capped at 8 KB.
- **Internationalization**: English (matching source repo).
- **Auth**: single demo user (admin). RBAC is out of scope for v1 but the audit log includes
  `actor` so it can be wired up later.
- **Print**: every transactional register has a "Print" button that opens a print-styled view
  (browser print) — substitutes for the original Crystal/Stimulsoft `.rpt`/`.mrt` templates.

## 5. Out of Scope (v1)

- Exact visual pixel match to the VB.NET WinForms UI.
- Replication of all 250 Crystal/Stimulsoft report templates (we replicate the most-used ~15).
- Multi-company / multi-tenant.
- Email / SMS integration (the `Sp_maillist1.sql` referenced a mail list but the mail-sender is
  out of scope).
- The `Flash.ocx` dashboard widgets — replaced by Chart.js KPI cards.
