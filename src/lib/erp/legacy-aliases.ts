/**
 * Legacy-forms alias map — SPEC-M30 (gap-audit §8-1).
 *
 * The menu-registry's legacyForms arrays carry 226 refs; 35 of them are NOT
 * names that exist in docs/form-taxonomy.json — renames/abbreviations, SQL
 * objects (ST_/Sp_/Vue_/Trs_ prefixes), report FILE names (Rpt/RPt), phantom
 * spellings, and our own new-UI inventions. Parity measurement joining refs
 * against the taxonomy was therefore fuzzy.
 *
 * THE FIX — every ref is now classified (and a test enforces the invariant):
 *   - LEGACY_FORM_ALIASES  the ref is an alternate name FOR a real form
 *                          (a rename, or a SQL object/report file that
 *                          served a real form's function) → map to the form.
 *   - NON_FORM_LEGACY      the ref is not a legacy FORM and never was →
 *                          excluded from parity counts; stays searchable in
 *                          the palette (operators remember the mnemonic).
 *
 * Raw strings inside MENU_ITEMS are deliberately NOT rewritten — they are
 * what operators remember and what the palette indexes (SPEC-M30 §2).
 */

// -------------------------------------------------------------------------
// Class A — renames (12) + Class B — SQL objects / report files (6).
// Every value VERIFIED present in docs/form-taxonomy.json (test-pinned).
// -------------------------------------------------------------------------
export const LEGACY_FORM_ALIASES: Record<string, string> = {
  // ---- Class A: the real form exists under another spelling ----
  FrmOrderReg: 'FrmOrderRegister',
  FrmAccStockRegister: 'FrmAccStockReg',
  frmProgEntry_Actual: 'frmProgNew_Actual',
  frmGRNEntry_Ret_Multi: 'frmGRNEntryAcc_Ret_Multi',
  FrmLabTestParameters_InputParameters: 'FrmLabTestInputParameters',
  FrmLabTestParameters_Stages: 'FrmLabTestStages',
  FrmLineInput_Manual: 'FrmLineInputManual',
  FrmPackingList_Solid: 'FrmLocalInvPackingList_Solid',
  FrmPanelExcessEntry_Stage: 'FrmPanelExcessEntryStage',
  FrmPieceStock_All: 'FrmPieceStockAll',
  Frm_ProductionWages_Dept: 'Frm_ProdWagesDept',
  Frm_ProductionWages_Stage: 'Frm_ProdWagesStage',

  // ---- Class B: SQL objects / report files → the form they served ----
  // ST_Ord_inHand was literally a SQL table name (gap-audit A1 documents
  // the in-hand item claiming it instead of the trading register form).
  ST_Ord_inHand: 'FrmTradingOrdersInHandReg',
  // stored proc behind the party-balance register
  Sp_POBalnce: 'FrmPartyBalanceRegister',
  // the view behind the stock ledger
  Vue_StkLedger: 'FrmStockLedger',
  // report file behind the fabric DC return form
  RPtFabDcRet: 'FrmFabDel_Return',
  // our M19-D export screen; the only Tally form in the taxonomy
  FrmTallyExport: 'FrmTally_GSTSetup',
  // our M11 flags screen; the legacy options form is its ancestor
  frmOptionsFlags: 'frmOptions',
}

// -------------------------------------------------------------------------
// Class C — NOT legacy forms (17): report files / stored procs / views /
// phantom spellings / our own new-UI inventions (legacy had no audit trail,
// no attendance screen, no closing-stock FORM). Searchable, never counted.
// -------------------------------------------------------------------------
export const NON_FORM_LEGACY: ReadonlySet<string> = new Set([
  'RptAccRateConfirm',
  'RptFabRateConfirm',
  'RptYarnRateConfirm',
  'RptPieceRateConfirm',
  'RptPieceRateConfirm_InHouse',
  'RptClosingStock',
  'FrmClosingStockRegister',
  'Rpt_JobwrkInvoice',
  'Sp_DailyUnitPANDL',
  'CurrentStock_RollDtl',
  'Trs_LineTfr',
  'CourierDC',
  'FrmYarnDel',
  'ST_ProgBalance_Fabric',
  'ST_ProgBalance_Yarn',
  'frmAttandance',
  'FrmAuditTrail',
])

/** One alias hop — unknown refs pass through; idempotent by construction. */
export function canonicalLegacyForm(ref: string): string {
  return LEGACY_FORM_ALIASES[ref] ?? ref
}

/**
 * The parity-count source: canonicalize → drop non-forms → dedup → sort.
 * Non-form refs (report files, stored procs, our inventions) are excluded —
 * counting them as legacy coverage would inflate parity dishonestly.
 */
export function countableLegacyForms(refs: readonly string[]): string[] {
  const out = new Set<string>()
  for (const ref of refs) {
    if (NON_FORM_LEGACY.has(ref)) continue
    out.add(canonicalLegacyForm(ref))
  }
  return [...out].sort()
}

/**
 * The palette search expansion: raw refs PLUS their canonical forms —
 * typing the REAL name (FrmOrderRegister) finds the screen even when the
 * array only carries the abbreviation (FrmOrderReg). Non-forms included:
 * they are search mnemonics, and search never claimed parity.
 */
export function searchableLegacyForms(refs: readonly string[]): string[] {
  const out = new Set<string>()
  for (const ref of refs) {
    out.add(ref)
    out.add(canonicalLegacyForm(ref))
  }
  return [...out]
}
