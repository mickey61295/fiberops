# 01 — ARCHITECTURE

## 1. Stack (fixed decisions)

| Concern | Choice | Rationale (legacy parity) |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | One codebase for desktop ERP (322 screens) and mobile Commando app via route groups |
| Rendering | Server Components for lists/registers; Client Components for document entry (line grids), barcode stations, dashboards | Mirrors legacy split: FlexGrid entry forms vs report viewers |
| Data access | SQL Server retained. Repository layer over `mssql` (connection pool) calling existing procs **first**, new parameterized SQL only where procs don't exist | Zero-change data layer preserves 13 years of business math; procs are the compatibility contract |
| DB schema | Existing schema unchanged: `Mas_*`, `Trs_*`, `ST_*`, `WBS_*`, `Pay_*`, `Pro_*`, `Prog_*`, `CurrentStock`, `Pcs_/Panel_StockTable*`, `Options` (flags table) | No deviation from original features/data |
| Mutations | Route Handlers (`app/api/**/route.ts`) — REST, typed with zod. Thin controllers → services | Replaces VB event handlers + ad-hoc SQL |
| Client state | TanStack Query (server data), Zustand (document-entry draft state: header + lines + picker selections), react-hook-form (masters/search) | Replaces FlexGrid row state |
| Realtime | SSE (`/api/events/stream`) for scan stations, approval inboxes, notifications; polling fallback | Replaces legacy polling/timers |
| Reports | Server-rendered datasets + viewer component (print CSS + PDF); definitions catalogued in 07 | Replaces Crystal/Stimulsoft/RDLC trio with one engine |
| Barcodes | `zxing` wasm for scanning (USB scanners = keyboard wedge, camera = getUserMedia); label rendering via SVG templates | Legacy uses zxing + MessagingToolkit — keep zxing lineage |
| Auth | Own auth against `Mas_User` (legacy table) + menu rights; session cookie (company + finyear + user context) | Legacy CompanyLogin→FinyearLogin→Login_New flow preserved |
| Flags | `Options` table (existing) exposed via `/api/config` and a React `FlagsProvider` — 189 flags, same names | `Fiberpro_Lib.dll` JSON parity |
| Validation | zod schemas per document type; tolerance/approval checks in services | Replaces scattered VB checks |
| PDF/print | Print-optimized React pages + server PDF for invoices/DCs/labels | Replaces 3 report engines + preprint overlays (PrePrint/298) |

## 2. Layering

```
Route (page.tsx / route.ts)      — auth guard, context, suspense
  └─ Controller (route handler)  — parse/validate (zod), call service, shape response
       └─ Service (module)       — business rules, tolerance/approval checks, numbering,
       │                           orchestration; ONE transaction per document action
            ├─ Repository        — proc calls / SQL; typed results
            ├─ PostingEngine     — signed stock movements across the 3 ledgers (03)
            ├─ Projectors        — ST_*/WBS_* aggregate maintenance (05)
            ├─ EventOutbox       — domain events (05): sync, notifications, approvals
            └─ NumberingService  — finyear-scoped doc numbers (DC/GRN/Bill/Inv...)
```

**Golden rules**
- Writes only via services; a document save = insert header/lines + posting + projector updates + outbox events inside ONE DB transaction (fixes legacy's missing atomicity *without* changing behavior).
- Reads via repositories/views; registers reuse legacy `Vue_*` semantics (a `Vue` per register) implemented as typed queries.
- The Posting Engine is the **only** code allowed to touch `CurrentStock`, `Pcs_StockTable(Qty)`, `Panel_StockTable(Qty)`. This centralizes what legacy did in ~50 procs + triggers.

## 3. Cross-cutting concerns

### 3.1 Session & context
`{ userId, groupId, coyCode (company), finyear, godown?, lineId? }` — company chosen at login (legacy `FrmCompanyLogin`), then finyear (`FrmFinyearLogin`). Every repository call receives context; procs that take `@Coycode/@Finyear` get it from here.

### 3.2 Rights
- Port `Mas_User`, `UserGroupMas`, `Trg_Mas_*` menu rights (`FrmMenuRights`, `FrmMenuAccRights`, `FrmCompanyRights`).
- `<Can do="dc.fabric.create">` guard component + server-side check in controllers (rights matrix in 06 per screen).
- Button-level rights (legacy allows per-button): `rights.action` map keyed `module.screen.action`.

### 3.3 Feature flags
`FlagsProvider` (client) + `getFlags()` (server) → typed `Flags` interface with the 189 legacy names (07). Gating patterns: hide field, toggle validation, switch document policy, enable module. Example: `need_rate_conf_for_dc` → `FabricDcService.create()` requires an approved `Pro_RateCnfPcs2` row or rejects with the legacy message.

### 3.4 Numbering
`NumberingService.peek/take(prefixKey, coy, finyear)` — prefixes from `Mas_SalesGrp` (`Sales_Inv_Yarn_Prefix` etc.), finyear-scoped sequences; supports legacy per-doc manual override flags (`manual_dc_no_option_reqd`, `sameordno`, `samepdcno`, `newdespatchno`, `dyeing_lotno_auto_generation`, `ocngen`, `ionogen`, `autocomp*`).

### 3.5 Multi-user staging
Legacy `Temp_*`/`Prog_ReqCalTWrk` tables keyed by IP/GUID → replaced by **server-side report jobs** with a `jobId` (GUID) and staged result rows in `ReportJob` cache table (same isolation, no IP sniffing).

### 3.6 Error contract
`{ code, message, fields? }`; legacy string messages preserved verbatim where users see them (e.g. `'INVALID TAG'`, `'ALREADY ISSUED TO LINE'`, `'BUNDLE COMPLETED'`, `'FINAL PROCESS PRODUCTION MADE'`).

### 3.7 Observability
Structured logs per document action (replaces `print 'a1'` debug); audit of style changes (`Trs_StyleChangeLog` kept), data deletes gated by admin rights screens.

## 4. Repository/proc contract (examples)

| Service method | Legacy proc(s) called |
|---|---|
| `OrderService.inHand()` | `SP_Vue_OrderinHand_ALL` family (shape selected by option) |
| `PlanningService.explode(orderId)` | `SP_FabReqCalc_*` (+`_ComboWise`), staging by jobId |
| `FabricDcService.create()` | own SQL + `Sp_currentstock` pattern replaced by PostingEngine; `FabDeliverySP` for picker |
| `GrnService.create('Process')` | own SQL + `TRG_*_BALANCE` logic moved to Projector |
| `ProductionService.postEntry()` | `Sp_ProductionEntryQty_1` dispatcher → `PROC_Stock_ProdPieces/ProdPanel[_Asm]/LineOut` |
| `BarcodeService.posting()` | `SP_Barcode_Production_Posting` (transactionalized), `SP_BundleBarcode_Check`, `SP_PcsBarcode_Check[_Rejection]` |
| `BillingService.billRegister()` | `SP_BillsRegView_{yarn,fab*,acc,cm,prd}` variants |
| `InvoiceService.salesInvoice()` | `SP_Vue_SalesInvoice*` family |
| `CostingService.budVsAct()` | `SP_Bud_and_Actual` (+`_1/_2`, `Temp_BudgetAndActual` → jobId) |
| `CostingService.dailyPL(date)` | `Sp_DailyUnitPANDL` |
| `WbsService.upsert()` | `Sp_WBS_Production[_DateWise]`, `Sp_WBS_Supp_Production` |
| `PartyBalanceService.*` | `Sp_Acc_PartyBalance`, `Sp_AccTransaction`, `PartyOutQry`, `SP_Party_Outstanding_Rate_Arrival` |
| `MeetingService.pack()` | `Meet_Accessories`, `MeetAccDetails`, `MeetingChartAllDept`, `SP_WBS_MeetingView` |

## 5. Environments & deployment

- Web app (Node) + SQL Server (existing). `appsettings` replaces `exe.config`; connection secrets in env (fixes legacy `sa`-in-template exposure — operational change only, no behavior change).
- Print stations: browser `window.print()` with preprint overlay templates (port of `PrePrint/298/*.mrt` geometry).
- Mobile: same Next.js app, `(mobile)` route group, offline-tolerant scan queue (05).
