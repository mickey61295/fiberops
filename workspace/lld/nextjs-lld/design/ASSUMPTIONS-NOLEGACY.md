# ASSUMPTIONS — NO-LEGACY-ACCESS BUILD MODE

**Context (2026-08-16):** the build agents (supervisor + workers) will NOT receive access to the legacy Fiberpro folder or databases. This document defines what that changes, the assumptions the build runs on, and the one-shot validation checklist for a human who DOES have access. Reference pack replacing live access: `SCHEMA-CATALOG.md`, `REPORT-PARAMS.md` (this folder), plus LLD `00-11` and `agent-docs/`.

## 1. What replaces legacy access

| Was (with access) | Now (no access) |
|---|---|
| Live-DB extract in WO-S0.2 (`sp_helptext`, catalog diff) | **WO-S0.2A:** bootstrap dev SQL Server from `SCHEMA-CATALOG.md` (create ~90 core tables + listed remainder; treat `?` types as NVARCHAR(50)/INT by name heuristics, flag in a `schema_todo` list) |
| Parity gate G2 vs legacy proc outputs | **G2 (no-legacy):** parity vs `tests/parity/golden/<prefix>.json` fixtures authored from the movement matrix (03 sec. 4) and proc-verification quotes (11) — expected DB deltas written by hand, not captured from legacy |
| `Sp_currentstock` body (blocker B1) | **Inferred spec below** — implement behind `PostingEngine.fabricLedger()`, marked `ASSUMPTION-1` in code and tests |
| `.mrt/.rpt` reading at implementation | `REPORT-PARAMS.md` for all Stimulsoft templates; Crystal (`.rpt`) params derived at implementation from the print previews + family patterns (ASSUMPTION-4) |
| Legacy sample data for golden sets | Synthetic fixtures generated from matrix + flags (Option defaults from 07 Part 2 defaults noted for THIS customer only — do not assume for others) |

## 2. ASSUMPTION-1 — `Sp_currentstock` inferred spec (highest risk)

From call sites (`CutACKStockPost`: `EXEC Sp_currentstock @Ordid,@StockId,@StyleNo,@GodID,@Type,@ARL,@AKG,@AMtr,-7,1[,@FRMStockID]`) and the on-disk `Sp_currentstock_RollDtl` sibling:

```
Sp_currentstock(@Ordid int, @StockId int, @StyleNo varchar(20), @GodID int,
                @Type '+'|'-', @BgRl numeric, @Kg numeric, @Mt numeric,
                @DeptId int = 0, @Flg int = 1, @FromStockId int = 0)
1. Row key: CurrentStock (Ordid, StockId, StyleNo, GodID). If absent: INSERT with the passed qty triplet.
2. '+': Bg += @BgRl, Kg += @Kg, Mt += @Mt.  '-': corresponding decrements.
3. @DeptId=-7 (cutting pool): when @FromStockId>0 the row/roll lineage records Frm_StockID=@FromStockId
   (RollDtl sibling behavior: '+' with FromStockId updates RollKgs/RollMtrs on the matching roll row;
   '-' with delflg='N' subtracts, else deletes the roll row; '-' on a missing roll row INSERTS a negative row).
4. @DeptId=11 special cases exist in RollDtl (compacting) — treated as pass-through for Bg/Kg/Mt.
```
**Validation (one-shot, 15 min with DB access):** `sp_helptext 'Sp_currentstock'` — confirm key columns, +/- branches, -7 lineage, insert-if-missing; diff against this spec; correct `PostingEngine.fabricLedger()` + fixtures.

## 3. Other standing assumptions

- **A2 schema fidelity:** column names/types in SCHEMA-CATALOG are usage-derived; ~5% may be wrong/missing. Rule: when a service needs a column the catalog lacks, the worker adds it via additive migration and logs it in `schema_todo` — never blocks.
- **A3 numbering/flags defaults:** defaults read from THIS customer's store; per-tenant values are data, not code.
- **A4 Crystal reports:** param lists for `.rpt` families approximated from family patterns; acceptance = layout sign-off per report, not exact parity.
- **A5 message strings:** the four verbatim scan messages + tolerance behavior from 11; other legacy strings are best-effort from docs.
- **A6 volumes:** index/perf targets from 08 sec. 9 assumptions, not measured legacy baselines.

## 4. Validation checklist for the human (run once, paste results back)

1. `sp_helptext 'Sp_currentstock'` output (ASSUMPTION-1).
2. `SELECT name FROM sys.procedures ORDER BY name` + `sys.triggers` + `sys.views` — one-off drift check vs SCHEMA-CATALOG section 3 list.
3. `SELECT TOP 5 * FROM Options` — real flag defaults (mask values).
4. One real DC + GRN pair for one order: header/line rows + ST_ProgBalance_Fabric before/after — to seed the first G2 fixture.
5. Two `.rpt` files exported with data (PO + SalesInvoice) for layout calibration.

Until then: build proceeds; every ASSUMPTION-n use site must carry the tag `ASSUMPTION-n` in code comments and test names so a later sweep can verify them in bulk.
