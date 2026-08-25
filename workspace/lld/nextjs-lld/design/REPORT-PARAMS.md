# REPORT-PARAMS.md - Stimulsoft .mrt report parameter reference

Self-contained reference for a build agent with NO legacy-system access.
Corpus: 150 Stimulsoft .mrt report templates under `Report\` (142 in `Report\`,
8 in `Report\OLD Report\`, marked OLD below) of the Fiberpro winforms app.
Generated 2026-08-15 by scripted extraction from the .mrt XML itself.

## 1. Method & caveats

- Source: every `.mrt` is XML rooted at `<StiSerializer version="1.0" application="StiReport">`.
  Parsed with a script (ElementTree); no .md docs and no binary artifacts were used.
- Report name = file name. The in-file `<ReportName>` element is the literal string
  "Report" in all 150 files, so it carries no information.
- Data sources: `StiOleDbSource` everywhere except `Form_JJ.mrt` and `Rpt_Program.mrt`
  (2 files, 4 sources, `StiOdbcSource`). No `StiSqlSource` and no `<TableName>` element
  exists - every source is a raw SQL text (`<SqlCommand>`), so "table name" = tables
  parsed from FROM/JOIN/UPDATE/INTO clauses of that SQL.
- Parameters: declared per data source in `<Parameters>` as `_x0040_Id,,5,0` which is
  `@Id` with size/precision ( Stimulsoft XML-escapes `@` to `_x0040_` ). OleDb/Odbc
  command text uses positional `?` placeholders (e.g. `WHERE Trs_Grn1.ID = ?`); the
  named `@param` binds BY POSITION to the n-th `?`. There are NO bare `@name` tokens
  inside SqlCommand text anywhere in the corpus (all references are `?`).
- Report variables (`<Variables>`, e.g. `,Buyer,Buyer,System.String,,False,False` ->
  name/type) exist in 105 of 150 files, 59 distinct. They are populated at runtime by
  the .cs wrappers (out of scope) - treat them as print options passed from code, not
  as user prompt input. The declared `@` parameters are the real query inputs.
- Connections: `<ConnectionString>` under `StiOleDbDatabase`. These are stale developer
  workstation strings (dozens of dev/test catalogs: JOMS, FiberPro, Raj, Test...).
  CREDENTIALS MASKED: only `Initial Catalog` + `Data Source` are recorded; user id and
  password are recorded as `SQL(user=***)`. Production connects via app config, not
  these strings; catalog names here are provenance hints only.
- `.rpt` (Crystal Reports, binary) files exist alongside (e.g. BarcodeLayReport.rpt,
  Rpt_PoAcc - Old.rpt): parameters are NOT extractable from them - derive at
  implementation time from print previews.
- `.cs` wrappers next to reports reveal only `ResourceName` binding - skipped.
- Families: 18 canonical families assigned by filename pattern (rule order documented
  in the generator): e.g. `debit`->Debit, `grn`->GRN, `cuminv/invoice`->Invoice,
  `_cost`->Budget/Costing, `pcs`->PcsDc, prefix yarn/fab/acc/gen->entity DC families,
  `dc_gst|form_jj`->GST/Tally. PO family has 0 .mrt members (PO prints are .rpt only).
- Param stats: 291 declared source-parameter occurrences; 15 raw names collapsing to
  9 canonical names (8 DTO fields after orderId merge) - see section 4.

## 2. Per-family index

| family | reports | common declared params (freq) | common source tables (freq) |
|---|---|---|---|
| YarnDC | 12 | @id (30) | Mas_Dept (12), Mas_Count (12), Mas_Exporter (12), OrderMas (12), StockTable (12) |
| FabDC | 11 | @id (29), @coycode (1) | Mas_Exporter (11), OrderMas (11), StockTable (11), Mas_Fabric (11), Mas_Dia (11) |
| PcsDc | 24 | @ipaddress (15), @id (12) | TempPcsDelDtls (10), Mas_Exporter (9), OrderMas (9), OrdSizeMas (9), Mas_Color (9) |
| AccDC | 5 | @id (9) | StockTable (5), Mas_Acc (5), Mas_Exporter (5), Trs_Del1 (4), Mas_AccDes (4) |
| GenDC | 3 | @id (3) | Mas_Party (3), Mas_Exporter (3), Mas_User (3), Trs_Gen1 (2), Trs_Gen2 (2) |
| SalesDC | 5 | @id (5) | Trs_Del1 (5), Trs_Del2 (5), Mas_Party (5), Mas_Exporter (5), OrderMas (5) |
| GRN | 11 | @id (11), @partyid (1), @finalprocess (1) | Mas_Exporter (11), Mas_Party (11), OrderMas (10), Trs_Grn1 (9), Trs_GRN2 (9) |
| Invoice | 10 | @id (20) | Mas_AddDed (9), Mas_Exporter (5), Vue_SalesInvoice (5), Trs_JobWrkInv (5), Trs_JWrkInvAddded (5) |
| Debit | 12 | @id (30) | Mas_Exporter (12), Mas_Party (12), OrderMas (12), Mas_AddDed (12), Mas_Dept (11) |
| PO | 0 | (no .mrt - PO prints are .rpt only) | - |
| OrderSheet | 7 | @id (18) | Mas_Color (5), Mas_Exporter (5), OrdSizeMas (4), Mas_Size (4), Mas_StyleDesc (4) |
| Packing | 3 | @id (11) | Mas_Color (3), Mas_Exporter (3), ordermas (3), BudPodet (2), BudPoMas (2) |
| Barcode/Labels | 1 | - (variables only) | - (no SQL sources) |
| Production/Cutting | 11 | @id (14), @ipaddress (3), @gbl_order (2) | OrderMas (8), Mas_Exporter (7), Mas_Dept (6), Mas_Color (4), Mas_Fabric (4) |
| Stock | 7 | @openingdate (3), @deptid (3), @ordid (3), @id (3) | Mas_Exporter (6), StockTable (6), OrderMas (6), Mas_Dept (5), Mas_Color (4) |
| Budget/Costing | 18 | @id (40), @ipaddress (4), @ordid (1), @gbl_order (1) | Mas_Exporter (13), OrderMas (12), Trs_Del3 (11), Mas_Color (11), Trs_Del1 (11) |
| Registers | 4 | @id (7) | Mas_Exporter (4), Mas_Party (2), Trs_TradeInwardMas (2), Trs_TradeOrdConFirmationMas (2), Trs_TradeOrdConFirmationDet (2) |
| GST/Tally | 6 | @id (10) | Vue_DCYarn (5), BudPoMas (2), BudPodet (2), Mas_Design (2), Mas_Dept (2) |

Corpus-wide table frequency (any family): Mas_Dept (150), Trs_Del1 (128),
Mas_Exporter (114), OrderMas (113), Mas_Color (92), Mas_Party (81), Mas_Count (79),
Trs_Del3 (78), StockTable (70), BudPodet (59), BudPoMas (59), Mas_Fabric (48),
Mas_Dia (47), Trs_Grn1 (46), Trs_Del2 (43), Pro_ReqKnitt2 (38).

## 3. Per-report catalog

Columns: report (file stem; OLD = from `Report\OLD Report\`) | declared params
(distinct, per source lists; `v=n` = count of report variables, see section 4) |
main tables (union across the report's sources, capped at 5, order of appearance) |
catalog-db = `Initial Catalog@Data Source`, credentials masked `SQL(user=***)`.

### YarnDC (12 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| RptOrdWiseYarnDC | @Id v=8 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +16 | JOMS@MACHINE-14 SQL(user=***) |
| RptYarnNewDc | @Id v=4 | Trs_Del3, Mas_Fabric, Mas_Dia, Trs_Del1, Mas_Dept +10 | Triknit@MACHINE-29\MSSQL2012 SQL(user=***) |
| YarnDC | @Id v=7 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +16 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDc_GoDown | @Id v=6 | Trs_Del1, Trs_Del2, Mas_Dept, Mas_Vehicle, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDC_SGST | @Id v=7 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +16 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDCWithoutPrg | @Id v=6 | Trs_Del3, Mas_Fabric, Mas_Dia, Trs_Del1, Mas_Dept +10 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDCWithoutPrg_SGST | @Id v=6 | Trs_Del3, Mas_Fabric, Mas_Dia, Trs_Del1, Mas_Dept +11 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDCWithSelPrg | @Id v=6 | Mas_Design, Tmp_KnitPrgDcDet, Mas_Dept, Trs_Del1, Trs_Del3 +15 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDCWithSelPrg_SGST | @Id v=6 | Mas_Design, Tmp_KnitPrgDcDet, Mas_Dept, Trs_Del1, Trs_Del3 +15 | JOMS@MACHINE-14 SQL(user=***) |
| YarnGanAcc | @Id v=3 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMAs2, Mas_Party +5 | JOMS@MACHINE-14 SQL(user=***) |
| YarnGanAcc1 | @Id v=3 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMAs2, Mas_Party +5 | JOMS@MACHINE-14 SQL(user=***) |
| YarnNewDC | @Id v=5 | Trs_Del3, Mas_Fabric, Mas_Dia, Trs_Del1, Mas_Dept +11 | JOMS@MACHINE-14 SQL(user=***) |

### FabDC (11 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| FabDC | @Id v=8 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | carona@MACHINE-14 SQL(user=***) |
| FabDC_GoDown | @Id v=4 | Trs_Del1, Trs_Del2, Mas_Dept, Mas_Vehicle, OrderMas +5 | FiberPro_Tailor@MACHINE-10 SQL(user=***) |
| FabDC_SGST | @Id v=6 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | JOMS@MACHINE-14 SQL(user=***) |
| FabGanAcc | @Id v=6 | Trs_Grn1, Trs_GRN2, OrderMas, Mas_Party, Mas_Exporter +5 | JOMS@Machine-16 SQL(user=***) |
| FabGanAcc1 | @Id v=6 | Trs_Grn1, Trs_GRN2, OrderMas, Mas_Party, Mas_Exporter +5 | JOMS@Machine-16 SQL(user=***) |
| FabNewDC | @Id v=2 | Trs_Del3, Trs_Del1, Mas_Dept, Mas_Color, Trs_Del2 +11 | AKKnit@MACHINE-58 SQL(user=***) |
| Rpt_TransDelFabNew | @Id v=9 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +15 | Anthony_new@Machine-10 SQL(user=***) |
| RPtFabDcRet | @id, @coycode v=3 | StockTable, Mas_Fabric, Mas_Count, Mas_Dia, Mas_Uom +5 | JOMS@MACHINE-14 SQL(user=***) |
| RPtFabDcRetnew | @id v=1 | StockTable, Mas_Fabric, Mas_Count, Mas_Dia, Mas_Uom +5 | JOMS@MACHINE-14 SQL(user=***) |
| RptFabNewDc | @Id v=6 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | Knitfort@MACHINE-14 SQL(user=***) |
| RptOrdWiseFabDC | @Id v=7 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | JOMS@MACHINE-14 SQL(user=***) |

### PcsDc (24 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| PcsDc -Acc | @Id | Trs_Pcs1, Mas_Exporter, Mas_Party, Trs_Pcs2, OrderMas +6 | JOMS@MACHINE-18\SQL SQL(user=***) |
| PcsDc | @IpAddress | TempPcsDelDtls | Dinesh@MACHINE-29\MSSQL2012 SQL(user=***) |
| PcsDc1 | @IpAddress | TempPcsDelDtls | Dinesh@MACHINE-29\MSSQL2012 SQL(user=***) |
| PcsDc1_SGST | @IpAddress | TempPcsDelDtls | esa1@MACHINE-14 SQL(user=***) |
| PcsDc1_SGST_Bit | @IpAddress | TempPcsDelDtls | Joms@MACHINE-29\MSSQL2012 SQL(user=***) |
| PcsDc1_SGST_Panel | @IpAddress | TempPcsDelDtls | esa1@MACHINE-14 SQL(user=***) |
| PcsDc_ACC | @Id | Trs_Pcs1, Mas_Exporter, Mas_Party, Trs_Pcs2, OrderMas +10 | JOMS@MACHINE-18\SQL SQL(user=***) |
| PcsDC_Acc_Pre | @Id | Trs_Pcs1, Mas_Exporter, Mas_Party, Trs_Pcs2, OrderMas +6 | JOMS@MACHINE-18\SQL SQL(user=***) |
| PcsDc_SGST_Large | @IpAddress | TempPcsDelDtls | Prime@MACHINE-58 SQL(user=***) |
| PcsDc_WithRate | @Id | Mas_Exporter, Trs_Pcs1, Mas_Party, Trs_Pcs2, OrderMas +5 | JOMS@MACHINE-18\SQL SQL(user=***) |
| PcsDcNew | @Id v=1 | Trs_Pcs1, Mas_Exporter, Trs_Pcs2, OrderMas, Mas_Godown +5 | JOMS@MACHINE-14 SQL(user=***) |
| PcsDespatch | @IpAddress | TempPcsDelDtls | Balu@MACHINE-58 SQL(user=***) |
| PcsDespatch1 | @IpAddress | TempPcsDelDtls | Morpho@MACHINE-58 SQL(user=***) |
| PcsDespatch_Large | @IpAddress | TempPcsDelDtls | Balu@MACHINE-58 SQL(user=***) |
| PcsPanelRejDcNew | @Id v=1 | Trs_RejGodTran1, Mas_Exporter, Trs_RejGodTran2, OrderMas, Mas_Godown +5 | JOMS@MACHINE-14 SQL(user=***) |
| PcsReceipt | @IpAddress v=1 | TempPcsRecDtls | Dinesh@MACHINE-29\MSSQL2012 SQL(user=***) |
| PcsReceipt1 | @IpAddress v=3 | TempPcsRecDtls | Raj@MACHINE-58 SQL(user=***) |
| PcsReceipt1_Large | @IpAddress v=3 | TempPcsRecDtls | Raj@MACHINE-58 SQL(user=***) |
| PcsReceipt2 | @Id v=2 | Mas_Part, Mas_StyleDesc, Trs_PcsGrn1, Mas_Exporter, Mas_Party +5 | Raj@MACHINE-58 SQL(user=***) |
| PcsReceipt4 | @IpAddress v=2 | TempPcsRecDtls | jegan@MACHINE-14 SQL(user=***) |
| PcsReceipt_Large | @IpAddress v=2 | TempPcsRecDtls | vivid@MACHINE-18\SQL SQL(user=***) |
| PcsRetDc | @Id | Trs_Pcs1, Mas_Exporter, Mas_Party, Trs_Pcs2, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| PcsShipSample | @IpAddress | TempPcsDelDtls | ESA@MACHINE-13 SQL(user=***) |
| PcsTransfer | @Id | Trs_Pcs1, Mas_Exporter, Trs_Pcs2, OrderMas, OrdSizeMas +5 | JOMS@MACHINE-14 SQL(user=***) |

### AccDC (5 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| AccDC | @Id v=3 | Tmp_AccDC, Preprint, Trs_Del3, Mas_Color, Trs_Del1 +12 | JOMS@MACHINE-18\SQL SQL(user=***) |
| AccDC_GoDown | @Id v=2 | Trs_Del1, Mas_Exporter, Mas_Dept, Trs_Del2, OrderMas +5 | FiberPro_Tailor@MACHINE-10 SQL(user=***) |
| AccDC_SGST | @ID, @Id v=3 | Tmp_AccDC, Preprint, Trs_Del3, Mas_Color, Trs_Del1 +7 | JOMS@MACHINE-18\SQL SQL(user=***) |
| RPtAccDcRet | @id v=1 | Mas_Acc, Mas_Uom, StockTable, Trs_Del2, Trs_Del1 +5 | ESA@MACHINE-13 SQL(user=***) |
| RPtAccDcRetNew | @id v=1 | Mas_Acc, Mas_Uom, StockTable, Trs_grn2, Trs_grn1 +5 | JOMS@MACHINE-18\SQL SQL(user=***) |

### GenDC (3 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| CourierDC | @Id | trs_courier1, Mas_Party, Mas_Buyer, Mas_courier, trs_courier2 +3 | Zeal@MACHINE-14 SQL(user=***) |
| GenDC | @Id | Trs_Gen1, Trs_Gen2, Mas_Exporter, Mas_Party, Mas_Uom +2 | JOMS@MACHINE-14 SQL(user=***) |
| GenDC_SGST | @Id | Trs_Gen1, Trs_Gen2, Mas_Exporter, Mas_Party, Mas_Uom +3 | JOMS@MACHINE-14 SQL(user=***) |

### SalesDC (5 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| FabSalesDC | @Id v=1 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| FabSalesDC_SGST | @Id v=2 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +5 | TestSpin@MACHINE-58 SQL(user=***) |
| YarnSalesDC | @Id v=1 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| YarnSalesDC_SGST | @Id v=3 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| YarnSalesDCold [OLD] | @Id v=1 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +5 | JOMS@MACHINE-18\SQL SQL(user=***) |

### GRN (11 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| AccDirectGRN | @Id | Trs_Grn1, Trs_GRN2, OrderMas, OrderMas2, Mas_Exporter +5 | JOMS@MACHINE-18\SQL SQL(user=***) |
| AccGRN | @Id v=2 | Trs_Grn1, Trs_GRN2, OrderMas, Mas_Exporter, Mas_Dept +5 | Raj@MACHINE-58 SQL(user=***) |
| AccGRNPO | @Id v=3 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMas2, Mas_Exporter +5 | JOMS@MACHINE-14 SQL(user=***) |
| FabGRN | @Id v=7 | Trs_Grn1, Trs_GRN2, OrderMas, Mas_Party, Mas_Exporter +5 | Raj@MACHINE-58 SQL(user=***) |
| FabGRN_MultiPrs | @Id, @PartyId, @FinalProcess v=4 | Trs_MultiPrs_Grn1, Trs_MultiPrs_Grn2, Trs_MultiPrs_Grn3, OrderMas, OrderMas2 +5 | TT@MACHINE-16 SQL(user=***) |
| FabGRN_PackList | @Id v=3 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMas2, Mas_Party +5 | win6pm@MACHINE-10 SQL(user=***) |
| FabNewGRN | @Id v=3 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMas2, Mas_Party +5 | JOMS@MACHINE-18\SQL SQL(user=***) |
| GenGRN | @Id | Trs_GenGrn1, Trs_Gengrn2, Mas_Exporter, Mas_Party, Trs_Gen1 +2 | Raj@MACHINE-58 SQL(user=***) |
| Woven_FabGRN | @Id v=7 | Trs_Grn1, Trs_GRN2, OrderMas, Mas_Party, Mas_Exporter +5 | JOMS@Machine-16 SQL(user=***) |
| YarnGRN | @Id v=4 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMAs2, Mas_Party +5 | JOMS@MACHINE-14 SQL(user=***) |
| YarnNewGRN | @Id v=3 | Trs_Grn1, Trs_GRN2, OrderMas, OrderMas2, Mas_Party +5 | JOMS@MACHINE-14 SQL(user=***) |

### Invoice (10 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| FabSalesDCCumInv | @Id v=3 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +7 | JOMS@MACHINE-14 SQL(user=***) |
| Rpt_Commercialbilldt | @Id | ShippingBill, ShippingBill_Det, OrderMas, Mas_Commercial, Mas_Exporter +6 | rajkrupa@MACHINE-15 SQL(user=***) |
| Rpt_DomesticInvoice_GST | @Id v=1 | Mas_Exporter, Trs_Inv_Domestic, Mas_Buyer, trs_Inv_DomesticDet, Ship_StyledescMas +5 | Poppys@MACHINE-29\MSSQL2012 SQL(user=***) |
| Rpt_SalesInvoice | @ID v=1 | Trs_Salinv, Trs_Del1, Mas_Exporter, Trs_Del2, Mas_Party +5 | JOMS@MACHINE-18\SQL SQL(user=***) |
| Rpt_SalesInvoice_GST | @ID v=9 | Vue_SalesInvoice, Trs_JobWrkInv, Trs_JWrkInvAddded, Mas_AddDed, Trs_SalInv +2 | FiberPro@MACHINE-16 SQL(user=***) |
| Rpt_SalesInvoice_GST_Pcs | @ID v=8 | Vue_SalesInvoice, Trs_JobWrkInv, Trs_JWrkInvAddded, Mas_AddDed, Trs_SalInv +2 | FiberPro@MACHINE-16 SQL(user=***) |
| Rpt_SalesInvoice_GST_WithoutTax | @ID v=9 | Vue_SalesInvoice, Trs_JobWrkInv, Trs_JWrkInvAddded, Mas_AddDed, Trs_SalInv +2 | FiberPro@MACHINE-16 SQL(user=***) |
| Rpt_SalesInvoiceOrdWise_GST | @ID v=16 | Vue_SalesInvoice, Trs_JobWrkInv, Trs_JWrkInvAddded, Mas_AddDed, Trs_SalInv +8 | FiberPro_Rinova@MACHINE-29\MSSQL2012 SQL(user=***) |
| Rpt_SalesInvoiceOrdWise_GST_WithoutTax | @ID v=16 | Vue_SalesInvoice, Trs_JobWrkInv, Trs_JWrkInvAddded, Mas_AddDed, Trs_SalInv +8 | FiberPro_Rinova@MACHINE-29\MSSQL2012 SQL(user=***) |
| YarnSalesDCCumInv | @Id, @Id_x0020_ v=3 | Trs_Del1, Trs_Del2, Mas_Party, Mas_Exporter, OrderMas +7 | JOMS@MACHINE-14 SQL(user=***) |

### Debit (12 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| DebitAcc | @Id v=3 | Trs_Deb1, Mas_Exporter, Mas_Party, Mas_Dept, OrderMas +7 | JOMS@MACHINE-25 SQL(user=***) |
| DebitAccGST | @Id v=3 | Trs_Deb1, Mas_Exporter, Mas_Party, Mas_Dept, Trs_Deb2 +7 | Test@MACHINE-29\MSSQL2012 SQL(user=***) |
| DebitComm_GST | @Id v=3 | Trs_Deb1, Mas_Exporter, Mas_Party, Trs_Deb4, OrderMas +5 | Test@MACHINE-29\MSSQL2012 SQL(user=***) |
| DebitFab | @Id v=3 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, Mas_Exporter, Mas_Party +7 | JOMS@MACHINE-25 SQL(user=***) |
| DebitFabGST | @Id v=3 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, Mas_Exporter, Mas_Party +7 | Test@MACHINE-29\MSSQL2012 SQL(user=***) |
| DebitYarn | @Id v=3 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, Mas_Exporter, Mas_Party +7 | JOMS@MACHINE-25 SQL(user=***) |
| DebitYarnGST | @Id v=3 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, Mas_Exporter, Mas_Party +7 | Test@MACHINE-29\MSSQL2012 SQL(user=***) |
| DirectDebitYarn | @Id v=3 | Trs_DirectDebAddDed, Mas_AddDed, trs_directdeb1, Trs_DirectDeb1, OrderMas +6 | JOMS@MACHINE-26\TC SQL(user=***) |
| DirectDebitYarnGST | @Id v=4 | Trs_DirectDebAddDed, trs_directdeb1, Mas_AddDed, Trs_DirectDeb1, Trs_DirectDeb2 +6 | globus@MACHINE-14 SQL(user=***) |
| RptDebitNotePcs | @Id v=5 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, trs_deb3, Trs_ProdBill +7 | JOMS@MACHINE-14 SQL(user=***) |
| RptDebitNotePcsGST | @Id v=5 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, trs_deb3, Trs_ProdBill +8 | Test@MACHINE-29\MSSQL2012 SQL(user=***) |
| RptDebitNotePcsGSTPcs | @Id v=6 | Trs_DebAddDed, Mas_AddDed, Trs_Deb1, trs_deb3, Trs_ProdBill +8 | Test@MACHINE-29\MSSQL2012 SQL(user=***) |

### PO (0 reports)

No .mrt templates; PO reports exist only as binary .rpt (`Rpt_PoAcc - Old.rpt`,
`Rpt_PoAcc - TAS.rpt`) - params not extractable, derive from print preview.

### OrderSheet (7 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| OrderSheetReg [OLD] | @Id | OrderQtyDtl, Mas_Color, OrdSizeMas, Mas_Size, Mas_StyleDesc +7 | JOMS@MACHINE-14 SQL(user=***) |
| OrderSheetReg_Set [OLD] | @Id | OrdQtyClrDtl, Mas_Color, OrdSizeMas, Mas_Size, Mas_StyleDesc +7 | JOMS@MACHINE-14 SQL(user=***) |
| OrderSheetRegFab | @Id | OrderQtyDtl, Mas_Color, OrdSizeMas, Mas_Size, Mas_StyleDesc +17 | Raj@MACHINE-58 SQL(user=***) |
| OrderSheetRegImage [OLD] | @Id | Mas_Buyer, Mas_Fcy, Mas_Season, OrderMas, Mas_Exporter +4 | JOMS@MACHINE-14 SQL(user=***) |
| OrderSheetRegImage_Set [OLD] | @Id | Mas_Buyer, Mas_Fcy, Mas_Season, OrderMas, Mas_Exporter +4 | JOMS@MACHINE-14 SQL(user=***) |
| OrderSheetRegYarn | @Id | OrderQtyDtl, Mas_Color, OrdSizeMas, Mas_Size, Mas_StyleDesc +11 | fiberpro_sarunatex@MACHINE-16 SQL(user=***) |
| RptOrderConfirmation | @ID | Trs_TradeOrdConFirmationMas, Trs_TradeOrdConFirmationDet, Mas_Party, Mas_Count, Mas_Color +1 | Famous@MACHINE-18\SQL SQL(user=***) |

### Packing (3 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| FabDC_PackList | @Id v=5 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +15 | fiberpro_winvel@global SQL(user=***) |
| FabDC_PackList_HalfPage | @Id v=5 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +15 | JOMS@MACHINE-14 SQL(user=***) |
| Rpt_PackingList | @Id v=9 | Trs_Packinglist_Mas, Trs_Packinglist_Det, Mas_Color, Mas_Size, Mas_Buyer +3 | majestic@MACHINE-29\MSSQL2012 SQL(user=***) |

### Barcode/Labels (1 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| RollPrint | - v=6 | - | - (no DB; variables only) |

### Production/Cutting (11 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| PanelDc1Rework_SGST | @IpAddress v=2 | TempPcsReWorkDtls | JOMS@Machine-16 SQL(user=***) |
| Pcs_IssueToProd | @IpAddress v=1 | TempPcsDelDtls | Guru@MACHINE-58 SQL(user=***) |
| PcsDc1Rework_SGST | @IpAddress v=2 | TempPcsReWorkDtls | morpo@MACHINE-14 SQL(user=***) |
| READYTOCUT | @Id | Trs_ReadyToCut1, Trs_ReadyToCut2, OrderMas, Mas_Dept, StockTable +5 | Fiberpro_Samara@MACHINE-14 SQL(user=***) |
| READYTOCUTRETURN | @Id v=7 | Trs_ReadyToCut_Ret1, Trs_ReadyToCut_Ret2, OrderMas, Mas_Exporter, StockTable +5 | JOMS@Machine-16 SQL(user=***) |
| Rpt_IssueToLine | @Id v=3 | Pay_Bundle_IsstoLine, Pay_Bundle_IsstoLine_Mas, Pay_BarcodeGeneration, OrderMas, Mas_Emp +1 | ESA@MACHINE-16 SQL(user=***) |
| Rpt_Program | @Id v=3 | OrderMas, Joms.dbo.Pro_ReqYarn, Joms.dbo.Mas_Count, Joms.dbo.Mas_Dept, Joms.dbo.Mas_Color +6 | - (Odbc DSN-based, no catalog/server) |
| RptCutBundleIss | @Id v=3 | Pay_Bundle_Despatch, Pay_Bundle_Despatch_det, Pay_CuttProdMas, Pay_CuttProd_Bundle, OrderMas +4 | Fiberpro_Eashwar@MACHINE-29\MSSQL2012 SQL(user=***) |
| RptCuttingStyle | @Id v=13 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | FiberPro_Cottonbuds@MACHINE-21\SQL SQL(user=***) |
| RptSupp_Process_Bill | @id, @Gbl_order_x0020_ | Mas_Dept, Supp_Process_Bill, Supp_Process_Bill_Dtl, Supp_Process_Plan, Mas_Party +6 | JOMS@MACHINE-14 SQL(user=***) |
| RptSupp_Process_Plan | @id, @Gbl_order | SuppOrdMas, Mas_Party, Mas_Exporter, Supp_Process_Plan, Mas_Dept +1 | JOMS@MACHINE-14 SQL(user=***) |

### Stock (7 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| AccOpening | @OpeningDate, @DeptId, @Ordid | Mas_AccDes, Mas_Acc, Trs_Opening, Mas_Exporter, StockTable +5 | JOMS@MACHINE-14 SQL(user=***) |
| AccStockAdj | @Id | Trs_Del1, Mas_Exporter, Mas_Dept, Trs_Del2, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| FabOpening | @OpeningDate, @DeptId, @Ordid | Trs_Opening, Mas_Exporter, Mas_Dept, StockTable, Mas_Fabric +5 | JOMS@MACHINE-18\SQL SQL(user=***) |
| FabStockAdj | @Id | Trs_Del1, Mas_Dept, Trs_Del2, Mas_Exporter, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |
| PcsFinishedGoods | @IpAddress v=1 | TempPcsDelDtls | Ice wear@MACHINE-19 SQL(user=***) |
| YarnOpening | @OpeningDate, @DeptId, @Ordid | Trs_Opening, OrderMas, Mas_Dept, StockTable, Mas_Mill +4 | JOMS@MACHINE-14 SQL(user=***) |
| YarnStockAdj | @Id | Trs_Del1, Mas_Dept, Trs_Del2, Mas_Exporter, OrderMas +5 | JOMS@MACHINE-14 SQL(user=***) |

### Budget/Costing (18 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| AccDC_SGST_Cost | @Id v=3 | Tmp_AccDC, Preprint, Trs_Del3, Mas_Color, Trs_Del1 +7 | JOMS@MACHINE-18\SQL SQL(user=***) |
| FabDC_SGST_Cost _Cut | @Id v=11 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | FiberPro_Gus@CLOUD-4 SQL(user=***) |
| FabDC_SGST_Cost | @Id v=13 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | piper@MACHINE-14 SQL(user=***) |
| FabDC_SGST_Cost_Full | @Id v=11 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | piper@MACHINE-14 SQL(user=***) |
| FabDC_SGST_Cost_PrsRt | @Id v=13 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +14 | Zeal@Machine-58 SQL(user=***) |
| FabDC_SGST_Cost_PrsRt_OrdWise | @Id v=13 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +14 | Zeal@Machine-58 SQL(user=***) |
| GenDC_SGST_Cost | @Id v=1 | Trs_Gen1, Trs_Gen2, Mas_Exporter, Mas_Party, Mas_Uom +4 | fa@MACHINE-13 SQL(user=***) |
| GenDC_SGST_Cost_a4 | @Id | Trs_Gen1, Trs_Gen2, Mas_Exporter, Mas_Party, Mas_Uom +3 | JOMS@MACHINE-14 SQL(user=***) |
| PcsDc1_SGST_Cost | @IpAddress v=1 | TempPcsDelDtls | Ice wear@MACHINE-19 SQL(user=***) |
| PcsDc1_SGST_Cost_1 | @IpAddress v=1 | TempPcsDelDtls | Ice wear@MACHINE-19 SQL(user=***) |
| PcsDc1_SGST_Cost_Large | @IpAddress, @OrdId | TempPcsDelDtls, Mas_Exporter, OrderMas | vivid@MACHINE-18\SQL SQL(user=***) |
| PcsDc1_SGST_Cost_old | @IpAddress v=1 | TempPcsDelDtls | Ice wear@MACHINE-19 SQL(user=***) |
| RptSupp_Process_Cost | @id, @Gbl_Order | SuppOrdMas, Mas_Party, Mas_Exporter, Supp_Process_Cost, Mas_Dept +2 | JOMS@MACHINE-14 SQL(user=***) |
| Woven_FabDC_SGST_Cost | @Id v=12 | BudPodet, BudPoMas, Mas_Color, Trs_Del3, Trs_Del1 +19 | piper@MACHINE-14 SQL(user=***) |
| YarnDC_SGST_Cost | @Id v=13 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +16 | JK@MACHINE-19 SQL(user=***) |
| YarnDC_SGST_Cost_Full | @Id v=11 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +16 | JK@MACHINE-19 SQL(user=***) |
| YarnDCWithoutPrg_SGST_Cost | @Id v=8 | Trs_Del3, Mas_Fabric, Mas_Dia, Trs_Del1, Mas_Dept +11 | JOMS@MACHINE-14 SQL(user=***) |
| YarnDCWithSelPrg_SGST_Cost | @Id v=6 | Mas_Design, Tmp_KnitPrgDcDet, Mas_Dept, Trs_Del1, Trs_Del3 +15 | JOMS@MACHINE-14 SQL(user=***) |

### Registers (4 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| Rpt_TradeCommission | @id v=2 | Trs_TradeCommission, Trs_TradeInwardMas, Trs_TradeInwardDet, Trs_TradeCommissionDet, Mas_Count +8 | fiberpro_sarunatex@MACHINE-14 SQL(user=***) |
| RptExpenses | @Id | ordermas, Trs_Expenses, Mas_Commercial, mas_user, Mas_Exporter +1 | nivvi@machine-15 SQL(user=***) |
| RptInward | @id | Trs_TradeInwardMas, Trs_TradeOrdConFirmationMas, Mas_Exporter, Trs_TradeOrdConFirmationDet, Trs_TradeInwardDet +3 | fiberpro_sarunatex@MACHINE-13 SQL(user=***) |
| RptUnitAck | @Id | Trs_UnitAck1, Mas_Exporter, Trs_UnitAck2, trs_pcs2, trs_pcs1 +6 | JOMS@MACHINE-14 SQL(user=***) |

### GST/Tally (6 reports)

| report | params | main tables | catalog-db |
|---|---|---|---|
| DC_GST - Copy [OLD] | @Id v=7 | Vue_DCYarn | JOMS@MACHINE-14 SQL(user=***) |
| DC_GST - Format1 [OLD] | @Id_x0020_ v=7 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +10 | JOMS@MACHINE-14 SQL(user=***) |
| DC_GST - Format2 [OLD] | @Id_x0020_, @Id v=7 | BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1 +10 | JOMS@MACHINE-14 SQL(user=***) |
| DC_GST | @Id v=11 | Vue_DCYarn | FiberPro_cossmo@MACHINE-29\MSSQL2012 SQL(user=***) |
| DC_GST_1 | @Id v=11 | Vue_DCYarn | FiberPro_cossmo@MACHINE-29\MSSQL2012 SQL(user=***) |
| Form_JJ | @Id | Trs_FormJJ | - (Odbc DSN-based, no catalog/server) |

## 4. Parameter name normalization map

### 4.1 Declared source parameters (the only SQL inputs)

Raw names as stored (case/space variants collapse): -> canonical DTO field.

| raw name(s) | freq | canonical field | type hint | binds to |
|---|---|---|---|---|
| @Id, @ID, @id, `@Id ` (x0020 space) | 252 | id | number (int) | 1st `?` - document PK (Trs_Del1.ID / Trs_Grn1.ID / Trs_Deb1.ID / Trs_SalInv.ID / OrderMas.ID ...) |
| @IpAddress | 23 | clientIp | string | `?` - workstation IP, keys temp tables (TempPcsDelDtls) |
| @OpeningDate | 3 | openingDate | date (datetime) | opening-stock as-of date (Stock family) |
| @DeptId | 3 | deptId | number | department filter (Stock family) |
| @Ordid, @OrdId | 4 | orderId | number | order master PK (Stock / Budget) |
| @Gbl_order, @Gbl_order , `@Gbl_order ` | 3 | orderId | string | global order no (Rpt_PackingList) |
| @PartyId | 1 | partyId | number | supplier/party PK (FabGRN_MultiPrs) |
| @FinalProcess | 1 | finalProcess | string/flag | last process stage (GenGRN) |
| @coycode | 1 | companyId | string | company code (FabGanAcc) |

Normalized DTO shape for a generic report request:

```
id?: number          // document PK; single-doc prints (all DC/GRN/Debit/Invoice)
orderId?: number     // or orderNos: string (comma list) for order-wise prints
deptId?: number      // Mas_Dept filter
partyId?: number     // Mas_Party filter
clientIp?: string    // temp-table scoping (pieces DC)
openingDate?: string // ISO date, opening stock
fromDate?/toDate?: string // NOT PRESENT in .mrt declares; date-range reports are
                         // .rpt (Crystal) - derive from print previews
```

### 4.2 Report variables (runtime print options set by .cs wrappers; 59 distinct)

| variable | type | freq | meaning (inferred from usage) |
|---|---|---|---|
| OrderNos | String | 61 | concatenated order numbers for header |
| Buyer | String | 51 | buyer name header text |
| OrderType | String | 46 | order type caption (e.g. WOVEN/KNIT) |
| ProcessType | String | 42 | process caption (KNITTING/DYEING...) |
| AuditFlg | String | 30 | show audit/tally lines flag |
| ExpAdd | String | 28 | exporter address block |
| PAdd | String | 25 | party address block |
| Terms | String | 25 | terms text |
| Rupees | String | 24 | amount-in-words line |
| DesignEntryFlg | Int32 | 22 | show design column flag |
| TimeFlg | String | 18 | show time column flag |
| Heading | String | 17 | report heading/caption |
| NetAmount | Double | 12 | computed net total |
| RoundingOff | Double | 12 | computed rounding |
| DcRate | ?Int16 | 11 | print DC rate column (nullable int) |
| BillStatus | String | 11 | process bill status caption |
| Dept | String | 11 | department caption |
| RptLen | String | 7 | report length variant selector |
| GoodsValue | Double | 7 | computed goods value |
| ReportRequired | String | 6 | which sub-report to print |
| Rupees1 | String | 4 | - |
| ExitDCNo | String | 3 | exit DC number reference |
| Amount | Decimal | 3 | - |
| PartyAdd | String | 3 | - |
| Type | String | 3 | - |
| OURPONos | String | 2 | - |
| GSTAmt | Decimal | 2 | - |
| DelType | String | 2 | - |
| orderno1 | String | 2 | - |
| Stage | String | 2 | - |

Remaining 29 low-frequency variables (freq 1-4) are per-report captions/totals:
Rupees1, Amount (Decimal+Double), AmountStr, PartyAdd, Type, OURPONos, GSTAmt,
DelType, orderno1, Stage, Iono/IoNo, customer, SuppOrder, Roundoff, NetAmt,
Exporter, GrnRef, vname, Concern, RollNoWt, LotNo, Colour, DiaFabric, Bundles/Bdl,
brno, CoyName.

## 5. Print-geometry notes

The XML encodes page size per `<Page>`/`<Sub_Report_*>` element (`<PageWidth>`,
`<PageHeight>`, `<Margins>` as `L,T,B,R`-style tuples). CAUTION: units are mixed -
some reports store CENTIMETERS (A4 = 21 x 29.7), others INCHES (A4 = 8.27 x 11.69).
First-page sizes across the 150 reports:

| size (WxH) | reports | interpretation | examples |
|---|---|---|---|
| 8.27 x 6 | 29 | inch - A4-width preprint challan stub (5.8-6.3in tall) | AccDirectGRN.mrt, AccOpening.mrt, DebitAcc.mrt |
| 8.27 x 5.8 | 25 | inch - half-page preprint challan stub | AccDC.mrt, AccDC_GoDown.mrt, AccDC_SGST.mrt |
| 8.27 x 11.69 | 22 | inch - A4 portrait | AccStockAdj.mrt, FabDC_PackList.mrt, FabGRN_PackList.mrt |
| 21 x 29.7 | 19 | cm - A4 portrait | DC_GST.mrt, DC_GST_1.mrt, FabDC_SGST_Cost_Full.mrt |
| 8.27 x 5.9 | 12 | inch - half-page challan variant | FabDC_GoDown.mrt, FabDC_PackList_HalfPage.mrt, FabNewDC.mrt |
| 21 x 14.73 | 10 | cm - A4-width half-height landscape stub | PcsDc1.mrt, PcsDc1_SGST_Bit.mrt, PcsDc1_SGST_Cost.mrt |
| 10 x 6 | 5 | inch - 10x6in ticket (process bill/cost, acc preprint) | PcsDC_Acc_Pre.mrt, PcsDc -Acc.mrt, RptSupp_Process_Bill.mrt |
| 11.69 x 8.27 | 3 | inch - A4 landscape | PcsDc_SGST_Large.mrt, PcsDespatch_Large.mrt, Rpt_Program.mrt |
| 12.3 x 5.8 | 2 | cm - custom gan-acc challan | FabGanAcc.mrt, FabGanAcc1.mrt |
| 21 x 15 | 2 | cm - wide pcs receipt/cut layout | PcsReceipt1.mrt, RptCutBundleIss.mrt |
| 8.27 x 6.3 | 2 | inch - challan stub variant | RPtAccDcRetNew.mrt, RptDebitNotePcs.mrt |
| 10.6 x 5.8 | 2 | inch - custom gan-acc challan | YarnGanAcc.mrt, YarnGanAcc1.mrt |
| 21 x 16.1 | 1 | cm - wide layout | FabDC_SGST_Cost _Cut.mrt |
| 21 x 15.3 | 1 | cm - A4-width tall stub | FabDC_SGST_Cost.mrt |
| 8.27 x 7 | 1 | inch - order-sheet image page | OrderSheetRegImage.mrt |
| 21 x 17.5 | 1 | cm - wide layout | PanelDc1Rework_SGST.mrt |
| (other one-offs) | 13 | label/ticket/stub formats | 21x16.73, 23.5x14.73, 7.9x5.83, 22x14.73, 8.27x6.43, 29.7x21, 8.27x6.5, 21x17.7, 2.4x1.6, 21x12.5, 10x8, 29.7x28, 8.27x6.25 |

Margin patterns (`<Margins>` = the 4-value tuple; L,T,B,R in same mixed units):
0.39x4 (54 pages), 0.3,0.39,0.25,0.25 (33), 0.508x4 (19), 0.762,0.762,0.254,0.254 (16),
1x4 (15), 0.3,0.3,0.1,0.1 (10). The 0.2,0.2,0.1,0.1 pattern marks preprint-aligned
challans where the printed stub must land on a pre-printed form.

A `Preprint` / `PrePrint` DB TABLE is referenced by 35 reports (21+14 occurrences) -
per-print settings (e.g. DcRateReqd) that switch layout variants at runtime; schema
lives in the SQL database, not the .mrt.

Preprint folder `PrePrint\298\` (separate from the 150-file corpus, listed
separately as instructed): 2 .mrt files -
- `RptYarnDC_SGST` (YarnDC): params @Id; tables BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1;
  conn JK@MACHINE-19 SQL(user=***); pages 8.27x11.69 m[0.2,0.2,0.1,0.1]; 7.9x6 m[0.2,0.2,0.1,0.1]; 7.9x6 m[0.2,0.2,0.1,0.1]
- `YarnDC_SGST_Cost` (Budget/Costing): params @Id; tables BudPoMas, BudPodet, Mas_Design, Mas_Dept, Trs_Del1;
  conn JK@MACHINE-19 SQL(user=***); pages 8.27x6 m[0.2,0.2,0.1,0.1]; 7.9x6 m[0.2,0.2,0.1,0.1]; 7.9x6 m[0.2,0.2,0.1,0.1]
Both mirror the Report\ YarnDC GST variants at build revision 298 (folder name =
revision); treat as historical duplicates unless diffing is required.

[END]
