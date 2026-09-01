# SPEC-M42 — Phase-6B Batch 6: Stock Take & Valuation Unification (INV-01..08)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §9 (Batch 6). Evidence layer: deep dive 2
(docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md). Dependencies: OPS-05 docKey anchor
shipped (Batch 1) — INV-01's auto-ADJ legs ride it; HFX-11 valueBucket shipped (Batch 0) —
INV-02 completes its contract. Every cited line re-verified on the M41 line (2026-09-02):
no StockTake/cycle-count anywhere (grep-verified); `bumpStock`'s update branch
(`posting/ledger.ts:48-56`) never touches `rate` — frozen at bucket creation (create branch
line 60 is the only writer); `postLedger` calls `bumpStock` WITHOUT rate (dropped at
`ledger.ts:111-119`); closing-stock values at the LATEST ledger rate (own inline math,
`closing-stock.ts:76-80`) while dashboard + stock-register use `valueBucket` and the
current-stock register rolls its own `qty × rate` (`current-stock.ts:22-23`) — three
surfaces, three valuations; `closing-stock.ts:34` is `orderBy docDate desc + take: 5000`
(dropping the OLDEST movements of a cumulative statement, not just truncating) and
`itemwise-stock.ts:33` repeats the cap; `bumpStock`'s own header says "warns on negative
stock but never blocks" and no guard exists at `postLedger`; `planWasteReceipt`
(`posting/stock-adj.ts:116`) delegates to `planStockAdjustment` VERBATIM — waste re-enters
GOOD stock at the good item's rate (`rate: item.rate`, line 50); no ledger↔cache
reconciliation exists; `planOpeningStock` (line 88) has no FY window check; StockLedger
carries only `@@index([createdAt])` + `@@index([docDate])` (`schema.prisma:431-432`).

Seam closed: **#6 physical reality ↔ ledger** (spec §15 loop-closure #6). No owner decision
blocks this batch (§17's eight items are all outside INV scope) — nothing deferred.

## §1 Scope — 8 FRs, zero deferrals

| FR | Ship |
|---|---|
| INV-01 | Stock take cycle: `StockTake` (ST-#### via the numbering registry, godown, status `open→counting→draft→committed`, notes) + `StockTakeLine` (per- uom system snapshot bags/kgs/mtrs/pcs + nullable counted columns); lines snapshotted from CurrentStock buckets at creation; count entry door (form action + `record_stock_counts` tool) while `open\|counting`; `advance_stock_take` walks the state graph — `draft` requires every line counted, `committed` posts one ADJ-#### leg per (line, uom) with non-zero variance (add/less, notes reference the ST-), stamps committedAt, terminal; count-sheet print docType `stock-take`; `/inventory/stock-take` list+new + `/inventory/stock-take/[id]` view+count+advance; loop-closure #6 green |
| INV-02 | One WAC valuation: `bumpStock` maintains moving weighted-average `rate` on in-branches (postLedger now passes `m.rate` through); OUT legs never move the rate; one shared `valueBucket()` consumed by closing-stock (rewritten to REPLAY the WAC from the ledger, as-of-date), current-stock register (switched from inline `qty×rate`), and dashboard (already) — all three surfaces show identical values; golden unit test pins dashboard total == register total == closing-stock-as-of-now total |
| INV-03 | No silent truncation: closing-stock's `take:5000` RETIRED — qty via `groupBy` _sum (complete at any row count) + rate via batched (5000/batch) ordered replay of in-rows (unbounded, no cap); itemwise-stock's `take:5000` replaced by `groupBy` _sum + `_count` (a true DB aggregate); the M14 perf gate re-run at 10k rows stays <300ms |
| INV-04 | Negative-stock guard: new flag `block_negative_stock` (boolean, tolerance, default false — legacy behavior preserved); when on, `postLedger` pre-computes the post-delta bucket and REFUSES any uom dropping below −1e-9 with an actionable error (item code resolved best-effort, on-hand, movement, flag-off guidance); rejection/shortage/transfer/despatch legs pass through it automatically (they all ride postLedger) |
| INV-05 | Waste as an identity: `planWasteReceipt` REWRITTEN — posts into the waste godown (flag `waste_godown_code`, default `WASTE`, auto-vivified on first use) at the scrap rate (flag `waste_scrap_rate`, default 0 = operator sets it) instead of the good godown at the good item's rate; WST- docNo stays the waste identity (no new txnType — decision §2-6); waste-% register (`/inventory/waste-percent` + csv): WST- kgs ÷ process_receipt kgs per item for the period — the knitting KPI becomes computable |
| INV-06 | Ledger↔CurrentStock reconciliation: `compareStockDrift()` (groupBy ledger sums vs CurrentStock buckets, both sides of every bucket) consumed by (a) the MIS 'stock drift' recon card (silent when clean — the PRC-07 pattern) and (b) the digest `stockDrift` section (scheduled: the daily cron digest ride, drift vectors = bucket key + ledger qty + cache qty + delta; silent when clean) |
| INV-07 | Opening stock gated: flags `opn_fy_gate` (boolean, default false — legacy) + `opn_fy_window_days` (number, default 30); when on, `planOpeningStock` refuses outside [active FY start, start + window days] with the FY + window named; no active FinYear row + gate on → actionable refusal (set an active FY); ties into the Phase-6 FY-close discipline |
| INV-08 | Hot-path indexes: StockLedger + `@@index([itemType, itemId])`, `@@index([godownId])`, `@@index([txnType])` via db push; register filters (itemType / godown / txnType families) stop full-scanning; the M14 perf test re-run proves the budget holds at 10k rows |

## §2 Design decisions

1. **WAC weights by the bucket's PRIMARY uom** (INV-02): a CurrentStock bucket carries ONE
   rate for all its uom columns (the HFX-11 documented approximation) — the moving average
   is therefore weighted by the item's primary uom qty (kgs for yarn/fabric, pcs for
   accessory/pcs — the movement-matrix `isKgsItem` rule, now exported from valuation.ts as
   the shared `primaryUomOf`). In-movements with `rate > 0` blend:
   `rate' = (max(0, oldQty)·rate + inQty·inRate) / (max(0, oldQty) + inQty)` (negative
   on-hand never weights); rate-0 ins and all outs leave the rate untouched (WAC
   convention — consumption never reprices). The closing-stock replay applies the SAME
   recurrence over the same rows in (docDate, createdAt) order, so as-of-now the replay
   equals the bucket bit-exactly (same IEEE754 op sequence) — that equality is the golden
   test. Back-dated documents post out of ledger order and can drift the replay from the
   bucket (documented, honestly): the digest drift card (INV-06) surfaces exactly such
   splits.
2. **The guard lives in postLedger, not bumpStock** (INV-04): bumpStock is also called
   directly (transfer.ts:229 — the null-dept bucket legs postLedger cannot express); a
   guard there would miss nothing today but postLedger is the choke point the spec names,
   and its error has the txnType/docNo context bumpStock lacks. Flag read happens
   out-of-tx (WAL: readers never block) — a mid-transaction flag flip can race one
   document, acceptable and documented (the P2002 docKey precedent tolerates the same
   class of race LOUDLY).
3. **Closing-stock = groupBy + batched replay, not one findMany** (INV-03): qty comes from
   a true `groupBy` (complete at ANY row count, aggregate in SQLite); rate comes from a
   replay of ONLY in-rows with `rate > 0` fetched in (docDate asc, createdAt asc) order in
   5000-row skip/take batches — unbounded (loop until a short batch), never silently
   capped, memory bounded per batch. The old `orderBy desc + take:5000` was worse than
   truncation: a cumulative statement losing its OLDEST movements silently drops opening
   balance — gone.
4. **StockTake lines snapshot ALL FOUR uoms** (INV-01): CurrentStock buckets are
   multi-uom (fabric can hold kgs AND mtrs); a count sheet that only offered the primary
   uom would be unauditable against the bucket. Variance = counted − system per uom; the
   auto-ADJ posts one leg per (line, uom) with |variance| > 1e-9 — ADJ-#### (nextAdjNo,
   docKey-anchored), rate = the bucket's current WAC rate (valuation continuity — the
   correction reprices nothing), notes `Stock take ST-#### — count variance`.
5. **The waste godown auto-vivifies; the scrap rate is a flag** (INV-05): godown rows are
   config, not business data — planWasteReceipt creating `WASTE` on first use (idempotent
   find-then-create) keeps the door zero-friction; the scrap rate is genuinely a company
   decision (default 0 — the operator sets `waste_scrap_rate`, waste then values at
   kgs × rate). Waste stays IDENTIFIED BY the WST- docNo family on
   `stock_adjustment_add` — the spec's own parenthetical ("the WST- txnType already
   exists") confirms the ledger identity is established; a distinct txnType would touch
   enums + movement-matrix + chain notes and buy nothing the docNo family doesn't already
   give the report (startsWith 'WST-' is the same filter nextWasteNo has always used).
6. **Waste-% denominator = process_receipt inKgs** (INV-05): "production kgs" for an item
   is what the chain actually books as production into stock — `process_receipt` rows
   (in-house process GRNs + jobwork returns both land it); the register labels the column
   honestly ("receipts kgs") and the % reads `WST- kgs ÷ receipts kgs` per item for the
   filtered period. Items with zero receipts and non-zero waste list with % = '—' (never
   a divide-by-zero).
7. **Drift compare is one pure function, two consumers** (INV-06): `compareStockDrift()`
   groups StockLedger by the bucket key (itemType, itemId, godownId — null-dim
   normalization identical to bumpStock's) and diffs against CurrentStock rows; the MIS
   card renders the top mismatches, the digest section (daily cron) lists them with
   vectors. The digest's ops section already proves the digest is the daily health
   surface — the scheduled compare rides it, no new cron.
8. **The OPN gate reads the ACTIVE FinYear, not the finYear string** (INV-07): the ledger
   hardcodes '26-27' (M3 legacy), but FinYear master rows carry real start dates; the gate
   resolves `active: true` (fallback: latest start) — the numbering module's
   activeFinYear() precedent. Gate-off = byte-identical legacy door.

## §3 Files

- schema: prisma/schema.prisma — StockTake + StockTakeLine NEW (relation-less FK, the
  SupplierBill precedent); StockLedger + three @@index entries (INV-08)
- valuation.ts: + `primaryUomOf()` (the isKgsItem rule, shared home)
- posting/ledger.ts: postLedger passes rate into bumpStock + the INV-04 guard
- posting/stock-take.ts NEW: planStockTake / planStockTakeCount / planStockTakeAdvance
- posting/stock-adj.ts: planWasteReceipt rewritten (waste godown + scrap rate);
  planOpeningStock + INV-07 gate
- registers/closing-stock.ts: groupBy + WAC replay rewrite; registers/itemwise-stock.ts:
  groupBy rewrite; registers/current-stock.ts: valueBucket switch;
  registers/waste-percent.ts NEW + register-configs/waste-percent.ts NEW
- registers/recon.ts (or mis inline): compareStockDrift + the MIS card;
  notifications/digest.ts: stockDrift section
- print: doc-type-map + fetchers — the count-sheet docType `stock-take`
- app: /inventory/stock-take (+[id]) pages + actions; /inventory/waste-percent page + csv;
  MIS card block; menu-registry + new-routes + LIVE_ROUTES + doc-view-actions entries
- agent: tools.ts + create_stock_take / record_stock_counts / advance_stock_take +
  list_stock_takes? (NO — the register page reads direct; three write tools only);
  tool-labels +3; prompt §inventory rewritten + few-shots folded (cap 8);
  PROMPT_VERSION m42-2026-09-02
- flags: block_negative_stock, waste_godown_code, waste_scrap_rate, opn_fy_gate,
  opn_fy_window_days (33 → 38)
- tests: tests/pipeline/inv-batch6.test.ts NEW (loop-closure #6, WAC golden, >5000-row
  completeness, guard matrix, waste identity + %, drift vectors, OPN window, source
  contracts, schema index pins); inherited pin updates (flags 33→38 ×5 spots, menu
  137→139, tools 243→246, register-configs 37→38, digest section, version pins m41→m42)

## §4 Acceptance

1. Loop-closure #6 GREEN end-to-end: seed stock → create ST- → enter short counts →
   commit → ADJ- legs exist referencing the ST- → CurrentStock equals the counts →
   closing-stock agrees.
2. The golden valuation test: after a mixed in/out sequence, dashboard total ==
   current-stock register Value total == closing-stock (as-of now) Value total, and
   CurrentStock.rate == the hand-computed WAC.
3. A 5,201-row single-item ledger yields a COMPLETE closing-stock + itemwise statement
   (no 5000 cap); the 10k perf gate stays under 300ms per query.
4. With `block_negative_stock` on, an over-issue fails with the actionable error naming
   item/godown/on-hand; with it off the same movement posts (legacy).
5. A waste receipt lands in the WASTE godown at the scrap rate, never in good stock at
   the good rate; the waste-% register computes the KPI with zero-division guarded.
6. The MIS card + digest section stay silent on a clean DB and name the drift vector on
   a hand-corrupted bucket.
7. `opn_fy_gate` on + today outside the window → planOpeningStock refuses naming the FY
   and window; off → posts (legacy).
8. `EXPLAIN QUERY PLAN`-equivalent source contract: the three new indexes exist in
   schema.prisma (pinned by test); vitest full suite green · tsc src 0 · eval --static
   PASS (m42-2026-09-02) · context_check NO DRIFT · route_smoke_m42 LIVE.
