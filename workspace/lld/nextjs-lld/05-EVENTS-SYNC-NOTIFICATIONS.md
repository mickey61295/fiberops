# 05 — EVENTS, PROJECTORS, SYNC (Commando), NOTIFICATIONS, APPROVALS

## 1. Domain events (transactional outbox)

Every service emits after commit-safe enqueue (04 §12). Event envelope: `{id, type, tenant(coy), payload, occurredAt}`.

| Event | Emitted by | Downstream |
|---|---|---|
| `order.created/amended/closed` | OrderService | OrdInHandProjector, WbsProjector, notifications to merchandiser group |
| `program.created/completed/cancelled` | ProgramService | ProgBalance projectors (Req leg), meeting pack refresh |
| `po.created/cancelled` | PoService | approval task (⚑ po_approval_reqd), ProgBalance.PO leg, auto-mail (⚑ poautomailreqd) |
| `grn.created/reversed` | GrnService | ProgBalance.GRN leg, CurrentStockRoll, ST sync, lot approval task (⚑ lot_approval) |
| `dc.created/reversed` | DcService | ProgBalance.DC/ReProcess legs, party-outstanding, gate-pass link, non-return-DC aging (→ approval) |
| `readytocut.passed/returned` | DcService | ProgBalance equalize, cutting planner |
| `cutack.recorded` | CuttingService | cutting pool posting, lay variance alert |
| `bundle.generated/issued/completed` | Cutting/Scan | line feed boards, payroll accrual |
| `prodentry.posted/reversed` | ProductionService | ST_Production_Data, WBS actuals, wages accrual, efficiency boards |
| `pcsrej.recorded` | PieceService | rejection registers, QC follow-ups |
| `bill.passed` | BillingService | payment queue, TDS report, cumulative-rate update (StockRatePost) |
| `invoice.created` | InvoiceService | ST_Ord_inHand 'DES' (if despatch), GST registers, Tally export queue |
| `debit.created` | DebitService | party balance adjust |
| `shortage.booked` | ShortageService | approval task (⚑ shortage_approval), ProgBalance.Short leg |
| `wbs.actualChanged` | WbsService | RAG recompute, meeting pack, mobile order detail |
| `wages.booked` | PayrollService | daily P&L projector |
| `breakdown.reported` | mobile | maintenance notification |
| **trace.\*** (08) — `trace.unit.created/voided`, `trace.owner_changed` (dc/grn/transfer), `trace.consumed` (cut/assembly), `trace.rejected/rework`, `trace.shipped` (carton→despatch), `trace.mismatch` (reconciliation) | PostingEngine (03 §10) | TraceProjector rollups, exceptions feed, order river live refresh, party-aging notifications |
| **ai.\*** (09) — `ai.doc.classified`, `ai.draft.created`, `ai.draft.confirmed`, `ai.draft.corrected`, `ai.digest.sent` | AI services | review-inbox sync to mobile, learning store, cost telemetry |

## 2. Projector pipeline (ST_*/WBS_* maintenance — trigger parity)

```
outbox → ProjectorWorker (in-order per aggregate key):
  ProgBalanceYarn/Fabric · PartyBalanceAbs · AccPartyBal/AccProgBalance
  ProductionData · OrdInHand · WBS(+DateWise/Supp) · CostFactory/Dept/OrderDtl
  CurrentStockRoll · DailyUnitP&L · MeetingCaches · TraceRollup (08)
each write ALSO sets UpdateFlg=1 (+ActualPosting_UpdateFlg for plan/actual fields) → sync queue
```
**TraceProjector (08):** rebuilds per-order/stage trace aggregates from `TrackEvent/TrackEdge`, then reconciles against `CurrentStock`, `Pcs_/Panel_StockTable`, `ST_Production_Data`, `Vue_Reqd_Vs_Finish`; deltas emit `trace.mismatch` → `/tracking/exceptions` + daily meeting pack. `TrackUnit/TrackEdge/TrackEvent` carry `UpdateFlg` and sync to mobile exactly like `ST_*` rows.
Recompute strategy = legacy semantics: **rebuild bucket from SUM(documents)** (exactly what the TRG_* triggers do), not incremental arithmetic — this preserves legacy self-healing behavior after back-dated entries. Single-row-trigger bugs are not reproduced: projectors aggregate over all rows of the affected key.

## 3. Commando sync (mobile layer parity)

Legacy protocol: every `ST_*`/`WBS_*` row has `server_id` + `UpdateFlg`; triggers set dirty; a sync service pushes to the mobile/cloud app ("Commando").

```
Pull:  GET /api/sync/pull?since=cursor → changed rows per table (UpdateFlg=1) + cursor
Ack:   POST /api/sync/ack {table, keys} → UpdateFlg=0, server_id=serverId
Push (mobile-created entries: production/stage/GRN/rejection/scan from /m):
  POST /api/... same services as desktop (04) — one code path; offline scans queue locally
  and replay with idempotency keys (scan token) to prevent double posting.
```
Mobile feature set (parity with existing app): dashboard, approvals (PO filter), orders, production entry, stage entry, GRN, rejection, stock transfer, unit transfer, gate pass, process DC, QC inspection, breakdown report, stock ledger, quick costing, bill lookup, party balance, notifications, scan + history, settings — **plus the new `/m/track` (scan-anything, item passport) and `/m/ai` (snap→draft, voice Q&A) surfaces from 08/09.**

## 4. Approval workflow engine

Types (02 §16): po, budget, lot, rate-confirm, shortage, reprocess, non-return-dc, acc-item, aw-bill. Routing config from `Frm_AppMas` port (approver matrix per type × dept × amount band). Behavior parity:
- blocking flags (e.g. `po_approval_reqd`) — document stays Draft until approved; non-blocking types appear as tasks only.
- decisions call the same service action the desktop form performs (approve rate → `Pro_RateCnfPcs2.Approved=1`; approve style change → run `OrderService.styleChange()`).
- `commando_approval_link` ties desktop decisions to mobile inbox state; SSE refreshes both.

## 5. Notifications & mail/SMS

- Channels: in-app (NotificationBell + `/m/notifications`), email (SMTP config parity with FrmSMSMailSetup; `inoutautomail`, `poautomailreqd`), SMS (`FrmSMSMailSetup`, `mobileno` flag on masters).
- Triggers (parity): PO awaiting approval; lot pending approval; non-return DC aging (default 5 days `gendcdays`); bundle completed at final stage; rejection spikes; WBS stage turned Red; bill due (billrptformat); breakdown reported.
- New (08/09): trace reconciliation mismatch; unit stuck at party beyond aging; voided-label scan attempt; AI draft awaiting review (daily nudge); AI digest (Tamil, `ai_digest` flag); scan-help fuzzy-resolve requests.

## 6. Barcode & device integration wiring

```
Cutting floor:  BundleGenerator → label print (SVG/zxing via print station)
Stitching lines: ScanConsole (keyboard wedge 1st, camera fallback)
  scan → POST /api/scan/piece → validations (route/contractor/final/rework) → Pay_Pcs_ProdEntry
  batch: POST /api/scan/posting → two passes (bundle-level & piece-level Pay_* rows, PostingFlg='N')
         → one Trs_ProdEntry(+Qty) per (date,ord,stage,part,size,line,lot,srcStage) group — note legacy
           inserts a HEADER PER SIZE and stamps PostingFlg by ProdDate only; the rewrite posts the
           whole batch in ONE transaction with group-scoped flags (verified-correct behavior, legacy
           defects not ported — see 11 §4)
Weight scale:   serial listener (FrmWeightScale_Integration parity) fills GRN/DC weight fields
Gate:           GatePass QR scan at exit (gatepassflg/gatepassopt)
Cross-db note:  legacy check-procs write Fiber_production..Pay_BundlePcs_Barcode directly and carry an
                unused @ProdDB param — the rewrite uses the configured production DB connection
```

## 7. Report job lifecycle (Temp_* parity)

```
POST /api/reports/:id/run {params} → {jobId}
  ReportService: stage rows into ReportJobRows(jobId, slno, cols...) (replaces Temp_*/IP-keyed tables)
GET /api/reports/jobs/:jobId → paged rows + totals
  viewer sorts/groups client-side (FlexGrid parity); print → PrintLayout with preprint overlays
jobs expire (configurable) — replaces manual temp cleanup screens (frmTblErase for report temps only)
```

## 8. Failure & recovery rules

- Any document action is atomic (03);PostingPreview shown before confirm; reversal always available with audit (replaces legacy `FrmDataDelete`/delete procs).
- Projector lag → dashboards show `stale` chip with refresh; documents remain authoritative (same as legacy where reports re-SUM).
- Sync conflicts: desktop wins; mobile pushes rejected with legacy-style message + retry queue.
