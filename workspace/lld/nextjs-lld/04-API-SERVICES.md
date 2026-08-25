# 04 — API & SERVICE CATALOG

Route handlers under `app/api/**`. All mutations: zod-validated → service → one transaction (03). `ctx` = session {user, group, coy, finyear}. Errors carry legacy message strings.

## 1. Session & config

| Endpoint | Service | Legacy parity |
|---|---|---|
| `POST /api/auth/login` (company→finyear→user) | `AuthService` | FrmCompanyLogin/FrmFinyearLogin/FrmLogin_New |
| `POST /api/auth/change-password` | `AuthService` | FrmChangePassword |
| `GET /api/config` | `ConfigService.getFlags()` | Fiberpro_Lib.dll JSON (189 flags) |
| `PATCH /api/admin/flags` 🔒 | `ConfigService.setFlag()` | Options editor |
| `GET /api/me/menu` | `RightsService.menuTree()` | FrmMenuRights/MenuAccRights/CompanyRights |

## 2. Orders

| Endpoint | Service method | Legacy |
|---|---|---|
| `GET /api/orders` (filters: buyer, merch, season, style, status) | `OrderService.list()` | OrderRegister family |
| `GET /api/orders/in-hand?variant=all\|salerate\|stylewise` | `OrderService.inHand()` | SP_Vue_OrderinHand* |
| `POST /api/orders` (export\|domestic\|trading) | `OrderService.create()` | OrderSheetNew family |
| `POST /api/orders/:io/amend` | `OrderService.amend()` | Amendment (+_Amend audit tables) |
| `POST /api/orders/:io/close` | `OrderService.close()` | FrmOrderClose |
| `POST /api/orders/:io/style-change` 🔒 | `OrderService.styleChange()` | SP_StyleChange (~140 tables + log) |
| `GET /api/orders/:io/ledger` | `OrderService.ledger()` | SP_OrderHistoryLedger |
| `GET /api/orders/:io/status` | `OrderService.status()` | SP_OrderStatus (pipeline kgs) |
| `GET /api/orders/:io/track` | `OrderService.track()` | FrmOrdProdTrack |
| `POST /api/orders/enquiry` / `sample` | `OrderService.enquiry/sample()` | FrmOrderEnquiry / samples |
| `POST /api/orders/:io/excel-input` | `OrderService.excelInput()` | FrmOrderRelatedInput_Excel |

## 3. Planning

| Endpoint | Service | Legacy |
|---|---|---|
| `POST /api/planning/program` (+cancel/complete) | `ProgramService.*` | frmProgNew family |
| `POST /api/planning/requirement/calc` → `{jobId}` | `PlanningService.explode()` | SP_FabReqCalc_*(+_ComboWise) |
| `GET /api/planning/requirement/:jobId` | `PlanningService.result()` | staged result |
| `GET /api/planning/reqd-vs-finish?ordId` | `PlanningService.reqdVsFinish()` | Vue_Reqd_Vs_Finish |
| `POST /api/planning/shortage` (+bit) | `ShortageService.book()` | frmShortage(_Compwise), ShortageBit |
| `GET /api/planning/cons/actual` | `PlanningService.consumption(variant)` | SP_ConsQuery1/2 family |
| `POST /api/planning/wbs` / `GET ?ordId` | `WbsService.upsert()/get()` | Sp_WBS_Production(_DateWise/_Supp) |
| `GET /api/planning/plan-date?date&days&dir` | `PlanningService.workingDayAdd()` | WF_PlanFinishDateArrival |
| `POST /api/planning/allotment/contract\|fabric` | `AllotmentService.*` | frmContractAllotment/fabric |
| `GET /api/planning/meeting?ordId` | `MeetingService.pack()` | Meet_Accessories/MeetAccDetails/Charts |

## 4. Procurement

| Endpoint | Service | Legacy |
|---|---|---|
| `POST /api/purchase/po` (yarn\|fab\|acc\|multi) | `PoService.create()` — tolerance+approval checks | frmPurchaseOrd* |
| `POST /api/purchase/po/:id/cancel\|complete\|accept` | `PoService.*` | FrmPOCancel/frmPoCompl/FrmPurGrnAccept |
| `GET /api/purchase/po?status=` | `PoService.list()` | SupplierOrderRegister/SuppOrdPendReg |
| `GET /api/purchase/rate-confirm?state=pending\|approved` | `RateConfirmService.list()` | SP_PendingRateCnf/SP_ApprovedRateCnf1 |
| `POST /api/purchase/rate-confirm/:id/approve` | `RateConfirmService.approve()` | Pro_RateCnfPcs*.Approved |
| Masters: `POST /api/masters/rate\|prdn-rate\|comm-rate\|default-rate` | `RateMasterService.*` | FrmRateMaster etc. |

## 5. GRN

| Endpoint | Service | Legacy |
|---|---|---|
| `GET /api/grn/picker?ordId&godId` | `GrnService.picker()` | FabDeliverySP inverse (stock picker) |
| `POST /api/grn` (body: grnType + lines + rollDtl?) | `GrnService.create()` → MovementMatrix 4.1 | frmGRNEntry family |
| `DELETE /api/grn/:id` | `GrnService.reverse()` | compensating (PROC_*_Delete parity) |
| `POST /api/grn/multi-process` | `GrnService.multiProcess()` | frmGRN_MultiProcess |
| `POST /api/grn/lot/approve\|separate` | `LotService.*` | FrmLotApproval/FrmLotSeparate |
| `GET /api/grn/lot/:lot` | `LotService.detail()` | frmLotWiseDtl |
| `POST /api/grn/waste` | `GrnService.waste()` | FrmWasteReceiptEntry |
| `POST /api/grn/dia-change` / `final-dia` | `FabricService.diaChange()` | FrmDiaChange/FrmFinalDiaUpdation |

## 6. DC

| Endpoint | Service | Legacy |
|---|---|---|
| `GET /api/dc/stock-picker?ordId&party&dept` | `DcService.stockPicker()` | FabDeliverySP (union doc lines) |
| `POST /api/dc/fabric` (TrType, ProcessType, Del3 prog lines) | `DcService.fabric()` | FrmGenDC/FabDel |
| `POST /api/dc/pieces` (+ship/rework) | `DcService.pieces()` | frmPcsDel family |
| `POST /api/dc/panels` | `DcService.panels()` | frmPanelDelRework |
| `POST /api/dc/acc` (+domestic issue) | `DcService.acc()` | FrmAccDel/frmDomestic_Acc_Issue |
| `POST /api/dc/returns` | `DcService.returns()` | TrType 4/6/13 |
| `POST /api/dc/ready-to-cut` (+return) | `DcService.readyToCut()` | TrType 20 |
| `POST /api/dc/gate-entry\|gate-pass` | `GateService.*` | FrmGateEntry/FrmGatePass |
| `POST /api/dc/:id/ack` (cutting) | `CuttingService.ack()` | Trs_CutApr |
| `DELETE /api/dc/:id` | `DcService.reverse()` | compensating |

## 7. Stock

| Endpoint | Service | Legacy |
|---|---|---|
| `GET /api/stock/current?ledger=fabric\|panel\|pcs` | `StockService.current()` | CurrentStock/3 ledgers |
| `GET /api/stock/register?variant=...` | `StockService.register()` | StockRegister family |
| `GET /api/stock/ledger?ordId&stockId` | `StockService.ledger()` | Vue_StkLedger |
| `POST /api/stock/transfer` (godown\|unit\|pcs-godown) | `StockService.transfer()` | TrType 14/17 |
| `POST /api/stock/ack/godown\|unit` | `StockService.ack()` | PROC_GodownAck_*/UnitAck_* |
| `POST /api/stock/adjustment` | `StockService.adjust()` | frmStockAdjustment family |
| `POST /api/stock/roll-split` | `RollService.split()` | FrmRollSplit |
| `POST /api/stock/opening` | `StockService.opening()` | frmOpeningStock(_CompWise) |

## 8. Cutting & Production

| Endpoint | Service | Legacy |
|---|---|---|
| `POST /api/cutting/production` | `CuttingService.production()` (bundles+barcodes generated) | FrmCuttingProduction_Auto_New |
| `POST /api/cutting/job-order` | `CuttingService.jobOrder()` | frmCuttingJobOrder |
| `POST /api/cutting/issue` | `CuttingService.issue()` | frmCuttingIssue |
| `POST /api/production/entry` | `ProductionService.entry()` → dispatcher (4.2) | frmProduction family |
| `POST /api/production/line-input\|line-out\|line-tfr\|issue-to-prdn` | `LineService.*` | Trs_LineInput/LineTfr |
| `POST /api/scan/bundle` | `ScanService.bundleCheck()` — messages verbatim | SP_BundleBarcode_Check |
| `POST /api/scan/piece` / `rejection` | `ScanService.pieceCheck()` | SP_PcsBarcode_Check(_Rejection) |
| `POST /api/scan/posting` 🔒 | `ScanService.posting()` — one transaction | SP_Barcode_Production_Posting |
| `GET /api/scan/history` | `ScanService.history()` | mobile scan-history |
| `POST /api/production/pcs-grn` (+multi/compwise) | `PieceService.receipt()` | PROC_PiecesReceipt parity |
| `POST /api/production/rejection` | `PieceService.reject()` | Trs_PcsRej |
| `POST /api/production/pcs-return` | `PieceService.jobReturn()` | frmJobWorkPcsReturn |

## 9. Commercial

| Endpoint | Service | Legacy |
|---|---|---|
| `POST /api/commercial/invoice/sales\|commercial\|local\|piece` | `InvoiceService.*` (DC attach, GST) | frmSalINV family |
| `POST /api/commercial/packing-list` | `PackingService.*` | FrmPackingList family |
| `GET /api/commercial/bills?variant=yarn\|fab\|acc\|cm\|prd` | `BillingService.register()` | SP_BillsRegView_* |
| `POST /api/commercial/bills/:id/pass` | `BillingService.pass()` (TDS) | frmBillPass |
| `GET /api/commercial/bills/to-be-value?ordId` | `BillingService.toBeValue()` | SP_BilltoBeValue* |
| `POST /api/commercial/debit` (+register) | `DebitService.*` | Trs_Deb1/2 |
| `POST /api/commercial/payment` (+wages) | `PaymentService.*` | FrmPaymentReg(_Wages) |
| `GET /api/commercial/party-balance?view=abs\|prog\|value` | `PartyBalanceService.*` | ST_* + PartyOutQry |
| `POST /api/commercial/tally-export` | `TallyService.export()` | RptTallyPurAndExp |

## 10. Costing, payroll, QC, approvals, reports

| Endpoint | Service | Legacy |
|---|---|---|
| `POST /api/costing/bud-vs-act` → jobId | `CostingService.budVsAct()` | SP_Bud_and_Actual |
| `POST /api/costing/daily-pl?date` | `CostingService.dailyPL()` | Sp_DailyUnitPANDL |
| `POST /api/costing/input` | `CostingService.input()` | Trs_DailyPrdn_Costing |
| `GET /api/costing/quick?ordId` | `CostingService.quick()` | ST_Cost_* cube |
| `POST /api/payroll/shift-wages` | `PayrollService.shift()` | Trs_ProdWages |
| `GET /api/payroll/wage-register?variant=shift\|production` | `PayrollService.register()` | SP_Vue_RptShiftWagesReg |
| `POST /api/qc/test` / `parameters` / `stages` | `QcService.*` | LabTest family |
| `GET /api/approvals?state=pending&type=` | `ApprovalService.inbox()` | mobile approvals |
| `POST /api/approvals/:id/approve\|reject` | `ApprovalService.decide()` | typed queues (02 §16) |
| `POST /api/reports/:id/run` → jobId | `ReportService.run()` | SP_Vue_* ALTER-VIEW family |
| `GET /api/reports/jobs/:jobId` | `ReportService.result()` | Temp_* staging |
| `GET /api/reports/print/:printId?docId` | `ReportService.print()` | 07 catalog |

## 11. Sync (Commando) & events

| Endpoint | Service | Legacy |
|---|---|---|
| `GET /api/sync/pull?since=` | `SyncService.pull()` — UpdateFlg=1 rows | server_id protocol |
| `POST /api/sync/ack` | `SyncService.ack()` | flag clear |
| `GET /api/events/stream` (SSE) | `EventBus.subscribe()` | notifications, approval refresh, scan station broadcasts |

## 12. Tracking (08)

| Endpoint | Service | Notes |
|---|---|---|
| `GET /api/tracking/:io/river` | `TraceService.river()` | stage funnel + reconciliation vs ledgers |
| `GET /api/tracking/:io/genealogy?focus=` | `TraceService.genealogy()` | DAG (depth-limited, paged) |
| `GET /api/tracking/unit/:trackId` / `timeline` | `TraceService.passport()` | item passport |
| `POST /api/tracking/resolve` {code, offlineSig?} | `TraceService.resolve()` | scan-anything: 1D/QR → unit + context (offline HMAC check) |
| `POST /api/tracking/scan` {code, stationCtx} | `TraceService.scan()` | generic event (routes into scan.* when stage-bound) |
| `GET/POST /api/tracking/policy` | `TraceService.policy()` | TrackPolicy per order/part/stage |
| `POST /api/tracking/labels/print` / `void` | `LabelService.print()/void()` | TrackLabelLog audit; sizes 08 §3 |
| `GET /api/tracking/exceptions` | `TraceService.exceptions()` | mismatches, missing scans, party aging, voided labels |
| `POST /api/tracking/backfill` 🔒 | `TraceService.backfill()` | phase-2 migration job |

## 13. AI harness (09)

| Endpoint | Service | Notes |
|---|---|---|
| `POST /api/ai/capture` (multipart: photo/file/voice/email-eml) | `AiCaptureService.ingest()` | doc classify + OCR → draft task (queue) |
| `GET /api/ai/inbox?state=&type=` / `GET /api/ai/drafts/:id` | `AiDraftService.list()/get()` | review queue w/ confidence + boxes |
| `POST /api/ai/drafts/:id/confirm` | `AiDraftService.confirm()` | maps draft→form DTO then calls the **same 04 endpoints** |
| `POST /api/ai/drafts/:id/correct` | `AiDraftService.correct()` | learning store |
| `POST /api/ai/assistant` {text\|voice} | `AssistantService.ask()` | skill router; read-only answers + draft-open intents |
| `POST /api/ai/prefill/:form` {source:draftId} | `AiDraftService.prefill()` | AiDock: open wizard prefilled |
| `GET /api/ai/digest` | `AiDigestService.today()` | Tamil exception briefing |
| `GET/POST /api/admin/ai/*` 🔒 | providers, prompts, golden set, cost/correction stats, kill switches | 09 §8 |

AI services carry **no posting logic of their own** — confirm/prefill funnel into the validated service layer above, with the user's rights and all flags/tolerances intact.

## 14. Service transaction template

```ts
class GrnService {
  async create(ctx, dto: GrnCreateDto) {
    return this.db.tx(async tx => {
      await this.guard.check(ctx, 'grn.create', dto);            // rights + flags (03 §6)
      const no  = await this.numbering.take(dto.docKey, ctx);     // finyear prefix
      const doc = await this.grnRepo.insert(tx, no, dto);         // Trs_Grn1/2 (+roll dtl)
      const mv  = MovementMatrix.grn(dto);                        // 03 §4.1
      const post = await this.posting.apply(tx, doc.ref, mv);     // CurrentStock ±
      await this.projectors.scheduleAll(tx, mv.keys);             // ST_* rebuild + sync flags
      await this.outbox.emit(tx, 'grn.created', {id: doc.id, ...});
      return { doc, post };                                       // PostingPreview payload
    });
  }
}
```
