# SPEC-M30 — Legacy-Forms Alias Hygiene (gap-audit §8-1 + §8-2/3/4 header drifts)

> Fourth six-task run, task 1. §8-1: "29 legacyForms strings in menu-registry
> reference names that don't exist in the taxonomy (renames/abbreviations/
> SQL objects … Parity *measurement* is therefore fuzzy — normalize with an
> alias map." Re-audit found **35** (six added since M19/M29 shipped new
> screens with invented names). Frozen before code (2026-08-30).

## 1. Audit result (the 35, by class)

**Class A — RENAMES (12):** the real form exists under another spelling.
`FrmOrderReg`→`FrmOrderRegister` · `FrmAccStockRegister`→`FrmAccStockReg` ·
`frmProgEntry_Actual`→`frmProgNew_Actual` ·
`frmGRNEntry_Ret_Multi`→`frmGRNEntryAcc_Ret_Multi` ·
`FrmLabTestParameters_InputParameters`→`FrmLabTestInputParameters` ·
`FrmLabTestParameters_Stages`→`FrmLabTestStages` ·
`FrmLineInput_Manual`→`FrmLineInputManual` ·
`FrmPackingList_Solid`→`FrmLocalInvPackingList_Solid` ·
`FrmPanelExcessEntry_Stage`→`FrmPanelExcessEntryStage` ·
`FrmPieceStock_All`→`FrmPieceStockAll` ·
`Frm_ProductionWages_Dept`→`Frm_ProdWagesDept` ·
`Frm_ProductionWages_Stage`→`Frm_ProdWagesStage`

**Class B — SQL OBJECTS / REPORT FILES (6):** legacy DB objects that served a
real form's function → alias to that form (the §8-1 evidence: `ST_Ord_inHand`
was literally a SQL table name).
`ST_Ord_inHand`→`FrmTradingOrdersInHandReg` (gap-audit A1 documented) ·
`Sp_POBalnce`→`FrmPartyBalanceRegister` (stored proc behind the register) ·
`Vue_StkLedger`→`FrmStockLedger` (view behind the ledger) ·
`RPtFabDcRet`→`FrmFabDel_Return` (report file behind the return form) ·
`FrmTallyExport`→`FrmTally_GSTSetup` (our M19-D export screen; the only
Tally form in the taxonomy) · `frmOptionsFlags`→`frmOptions` (our M11 flags
screen; the legacy options form).

**Class C — NON-FORM STRINGS (17):** strings that are NOT legacy forms and
never were — they stay **searchable** in the palette (operators may remember
the mnemonic) but are **excluded from the parity count**:
`RptAccRateConfirm`, `RptFabRateConfirm`, `RptYarnRateConfirm`,
`RptPieceRateConfirm`, `RptPieceRateConfirm_InHouse`, `RptClosingStock`,
`FrmClosingStockRegister`, `Rpt_JobwrkInvoice`, `Sp_DailyUnitPANDL`,
`CurrentStock_RollDtl`, `Trs_LineTfr`, `CourierDC`, `FrmYarnDel`,
`ST_ProgBalance_Fabric`, `ST_ProgBalance_Yarn`, `frmAttandance`,
`FrmAuditTrail` — report files / stored procs / views / phantom spellings /
our own new-UI inventions (M15 audit, M20 attendance) that the legacy system
simply did not have. (Closing stock never had a legacy FORM — the register
was the report file `RptClosingStock`; mapping it to `frmOpeningStock` would
be dishonest coverage inflation, so both stay non-form.)

## 2. Design

- NEW `src/lib/erp/legacy-aliases.ts` — pure module:
  - `LEGACY_FORM_ALIASES: Record<string, string>` — Classes A+B (18 entries,
    every target VERIFIED present in docs/form-taxonomy.json).
  - `NON_FORM_LEGACY: ReadonlySet<string>` — Class C (17 entries).
  - `canonicalLegacyForm(ref)` — one alias hop, idempotent.
  - `countableLegacyForms(refs)` — canonicalize → drop non-forms → dedup →
    sort. THE parity-count source.
- Parity page (`/parity`): the Legacy column shows
  `countableLegacyForms(item.legacyForms).length` — the honest count (a
  tooltip lists raw refs when any were dropped).
- CommandPalette (M29's search value): joins raw refs **plus** their
  canonical expansions — typing the REAL name (`FrmOrderRegister`) now finds
  the screen even though the array carries the abbreviation.
- Header drifts fixed: menu-registry "ITEMS (131)" → 132 (the test already
  pins 132); reports/index.ts "15 BINDINGS + 13 new" → **16 bindings + 12
  aggregates** (verified by grep; 28 total stays); the same stale split in
  tests/unit/report-configs.test.ts's description (count pins untouched).
- OUT (documented): rewriting the raw strings inside MENU_ITEMS (the raw
  mnemonics stay — they are what operators remember and what the palette
  indexes); taxonomy JSON edits; counting non-forms as coverage.

## 3. Tests (`tests/unit/legacy-aliases.test.ts` NEW)

1. **The completeness invariant** (the anti-regression): every legacyForm in
   MENU_ITEMS is either a taxonomy form, an alias key, or a non-form —
   nothing unclassified (reads docs/form-taxonomy.json — the M29 jump.test
   precedent for reading JSON in vitest).
2. Every alias TARGET exists in the taxonomy (17 targets).
3. Every NON_FORM_LEGACY entry is NOT in the taxonomy (else it should have
   been an alias) and does not collide with alias keys.
4. canonicalLegacyForm: rename + sql-object hops; unknown passthrough;
   idempotence; non-forms pass through unchanged.
5. countableLegacyForms: drops non-forms, canonicalizes, dedups
   (FrmOrderReg + FrmOrderRegister → one), preserves count when all real.
6. Source pins: parity page imports countableLegacyForms; palette joins
   canonical expansions; menu-registry header no longer claims 131;
   reports/index.ts header claims 16.

## 4. Acceptance gates

tsc src/ 0 · vitest (1016+N) · eval --static PASS · context_check NO DRIFT
(+legacy-aliases.ts +legacy-aliases.test.ts +SPEC-M30.md) · no menu/route/
tool/schema change (menu 132, routes 165, tools 227 all stay) · LIVE
browser-verified (parity page renders honest counts; palette finds
`FrmOrderRegister`).

## 5. Implementation record (filled at ship time)

- The audit script (`scripts/audit_legacy_forms.py`) re-ran against the
  taxonomy: **35** broken refs (the §8-1 "29" grew by six — M19 registers
  and M29-era items added refs like `CourierDC`, `frmOptionsFlags`).
- `legacy-aliases.ts` as specced: 18 aliases (12 renames + 6 SQL/report
  objects) + 17 non-forms; `canonicalLegacyForm` single-hop; 
  `countableLegacyForms` (canonicalize → drop non-forms → dedup → sort);
  `searchableLegacyForms` (raw + canonical for the palette).
- `parityStats` counts through `countableLegacyForms` — the union set now
  holds canonical names only; coverage stays 100% (all items live) but the
  DENOMINATOR is honest (272 unique refs → 249 countable canonical forms).
- Parity page: honest count + `(+N dropped)` hint + title listing the
  non-form refs; verified LIVE — Rate Confirmation `0 (+3)`, Closing Stock
  `0 (+2)`, Party Balance `2` (Sp_POBalnce canonicalized + deduped),
  Order Register `3`.
- CommandPalette joins `searchableLegacyForms` — LIVE: typing
  `FrmOrderRegister` (the REAL name) finds Order Register (previously
  impossible — the array carries only `FrmOrderReg`); raw mnemonic still
  finds it; zero console errors; screenshot m30-parity-aliases.png.
- Header drifts: ITEMS 131→132 (test already pinned 132 — comment-only);
  reports/index.ts 15/13→16/12 split (header + inline + the test's
  description string; the 28/28 count pins untouched).
- Tests: legacy-aliases.test NEW 20 — the completeness invariant reads
  docs/form-taxonomy.json and fails on ANY unclassified future ref; targets
  verified; collision checks; single-hop; idempotence; countable/searchable
  semantics; 5 consumer source pins.
- Gates: tsc src/ 0 · vitest **1036** (1016+20) · eval --static PASS ·
  context_check 560→**563**/563 NO DRIFT (+3 file pins) · zero menu/route/
  tool/schema change (132/165/227/78 all stay).
- Test-authoring note: `join(__dirname, '../..')` from tests/unit — the
  first draft's `../../..` overshot to /home/z (ENOENT caught it).
