# Fiberpro Schema Catalog (SQL Server)

## 1. How to read this

- Self-contained reference for a build agent with NO access to the legacy codebase. Best-effort extraction from 418 .sql files under SPQuery (incl. OLD), SPFunction, SPTriggers (incl. SPViews, Updated), Report\SPTriggers (incl. SPViews, Updated), Report\Query. No .md/.txt docs read.
- Method: harvested INSERT column lists, UPDATE SET columns, FROM/JOIN alias-qualified refs and temp-table CREATE definitions; aggregated per table; hand-curated (alias/CTE noise removed). No CREATE TABLE DDL exists on disk for persistent tables (only temp staging DDL + one commented CREATE TABLE Trs_StyleChangeLog), so ALL types are inferred from proc params, CASE usage, comparisons. `?` = unknown/uncertain.
- Type conventions (inferential): *Id/*ID = int; StyleNo varchar(20); LotNo varchar(15); Barcode varchar(30); FinYear char(2); flags char(1) (GoodPcsFlag 'G' good/'M' mixed; ReWork 0/1); Kgs/Rls numeric(18,3); Mtr/Gsm/rates/amounts numeric(18,2)/(18,3); piece counts int; dates datetime.
- UpdateFlg on nearly every table = audit flag set to 1 by Trg_<Table>_Update trigger (replication infra, not business data).
- Block format: purpose, keys, cols (grouped keys/qty/flags/dates/refs, `->` = references), top = procs touching the table most (frequency-verified); n cols / n files = distinct columns seen vs referencing files.
- Header/line convention: Trs_X1 = header, Trs_X2 (sometimes 3/4) = lines sharing the same Id; newer tables use TransId -> parent Id (section 4).
- Excluded as noise: inserted/deleted pseudo-tables, sysobjects/syscolumns/systypes, cursor/CTE/alias names (a, b, t, tt, cte, dpl, meeting). Coverage: 449 table names, 3350 distinct table.column pairs; ~100 core tables below.

## 2. Core tables (detailed)


```
Mas_Party - trading parties: suppliers, processors (knitters/dyers), contractors
  keys: Pid int PK (referenced as PartyId/Party/Pid/ContractorId); StateId -> Mas_State.Id
  cols: PName, PAddress, Phone, TIN, CST, GSTNo, PAN; Own_Party?; UpdateFlg
  top : SP_Vue_SalesInvoice*, SP_DEL_PRSRT, SP_PcsDcPrintQry | 11 cols / 51 files
```
```
Mas_Buyer - buyer/customer master
  keys: BuyerId int PK; StateId -> Mas_State.Id
  cols: BuyerName, ShortBuyer, BuyerAddress, Phone, GSTNo; UpdateFlg
  top : SP_Vue_OrderinHand*, SP_Vue_Order_in_Hand_SaleRateWise* | 8 cols / 45 files
```
```
Mas_BuyerDept - buyer department/label master
  cols: Id PK; BuyerDeptDesc; UpdateFlg
  top : Sp_DomesticPL, Sp_maillist1 | 3 cols / 3 files
```
```
Mas_Exporter - exporter/company master; units are rows linked to parent concern
  keys: ExpId int PK; StateId -> Mas_State.Id; BankId -> Mas_Bank?; Unit_ParentConcernId -> self?
  cols: ExporterName, ShortExp, ExporterAddress, Phone, EmailId, GSTNo, TIN, CST, PAN, IONOCaption; Active, IsUnit, UpdateFlg
  top : SP_Vue_OrderinHand*, SP_DEL_PRSRT, Spl_Bills_InvPcs* | 16 cols / 77 files
```
```
Mas_StyleDesc - style master (StyleNo strings live on order tables, not here)
  cols: StyleId PK (OrderStyleDtl.StyleId -> here); StyleDesc; UpdateFlg
  top : SP_Vue_OrderinHand*, SP_Qry10/12, SP_VUE_DCYARN* | 3 cols / 21 files
```
```
Mas_Fabric - fabric master
  keys: FabId PK; FabGrpId -> Mas_FabricGroup?; PriUOMId -> Mas_UOM.UOMId; HSNId -> Mas_HSN.Id
  cols: FabDesc; BrandedFlag, UpdateFlg
  top : sp_Collar, sp_fabricdet, sp_knitdetail | 7 cols / 54 files
```
```
Mas_Color - color master
  cols: ColId PK (a.k.a. ClrId/ColorId); ColorDesc; Active, UpdateFlg
  top : Proc_Rpt_OCR_Summary*, Vue_YarnProgBalDetail* | 4 cols / 76 files
```
```
Mas_Count - yarn count master
  keys: CountId PK (a.k.a. CntId); CountGrpId -> Mas_YarnCountGroups?; HSNId -> Mas_HSN.Id
  cols: CountName; BrandedFlag, Active, UpdateFlg
  top : Vue_YarnProgBalDetail*, sp_yarndet, sp_ydye | 7 cols / 43 files
```
```
Mas_Mill - yarn mill master
  cols: MillId PK; Mill, ShortMill; UpdateFlg
  top : SP_OrderStatus_1/2/3, Vue_Dailyinout | 3 cols / 16 files
```
```
Mas_Dia - knitting diameter master (grey; finish dia refs FinDiaId/FindiaId)
  cols: DiaId PK; Dia (numeric-as-text, also value-compared); UpdateFlg
  top : SP_Fab_Wise_Program, FabDeliverySP, VUE_DEL_PRSRT | 3 cols / 21 files
```
```
Mas_Design - knit/print design master (StockTable.Print_DesignId -> here)
  cols: DesignId PK; DesignDesc; UpdateFlg
  top : sp_knitdetail, Vue_Dailyinout, SP_Vue_SalesInvoice* | 3 cols / 27 files
```
```
Mas_Part - garment part master (body, sleeve, collar, cuff...)
  cols: PartId PK; PartName; UpdateFlg
  top : SP_BudAndActual_Det*, Proc_Rpt_OCR_Summary* | 3 cols / 32 files
```
```
Mas_Size / Mas_SizeGroup - size master and size-group master
  Size: SizeId PK (a.k.a. SizId); SizeDesc; UpdateFlg (37 files) | SizeGroup: only sync trigger on disk, columns unknown
  top : MeetAccDetails, Vue_Dailyinout, SP_Qry5_Panel | 4 + 1 cols
```
```
Mas_Lot - lot master (color lots within an order-style)
  keys: LotSno int PK (a.k.a. LotId; Pcs_StockTable.LotID -> here); LotName varchar = LotNo, joined BY NAME on order tables
  cols: UpdateFlg
  top : PROC_Stock_ProdPieces_Update*, PROC_GodownAck_Insert | 3 cols / 18 files
```
```
Mas_Dept - DEPARTMENT master with process-flow config (not the stage key; see Mas_JobWrkComp)
  keys: DeptId PK (Trs_Grn1.Dept = Mas_Dept.DeptID verified)
  refs: CntId, ColId, FabId, SizId, ComId?, StockId->StockTable, OrdId?, DiaId/FinDiaId->Mas_Dia, Print_DesignId
  spec: GG, LL, Gsm, FinGsm, Dia, Fdia, YClr, YCount, ConsPer, PcsWgt, OrdersNo (chain order no)
  flow: InputType, OutputType, RecMethod, RateMethod, DeptType, Grp, DeptGrpCode?, ShortDept, Semifinish (semi-finish marker for FinalStage logic), ProdDept, AccProsDept, Procbill, DCFormat, DC_TermCode, ProgReqPrn, ProgFrm_Issue, ColEntryMust, Manual_BudgetKgs_Entry, Un_Planned_Process; UpdateFlg
  top : SP_BudAndActual_Det*, Vue_YarnProgBalDetail* | 45 cols / 142 files
```
```
Mas_JobWrkComp - STAGE master / job-work composition (THE StageId domain)
  keys: Id int PK (joined as StageId, TargetStageId, SourceStageId, WrkId, Trs_BillRate.Dept); DeptId -> Mas_Dept.DeptID (verified chain)
  cols: WorkComplDet (stage/work description); RateMethod, ProdType, PcsType, Related_Stage?
  spec: CntId, ColId, FabId, DiaId, FinDiaId, SizId, GG, Gsm, FinGsm, LL, Print_Designid, StockId, OrdId?; UpdateFlg
  top : SP_BudAndActual_Det*, VUE_RPT_BUDABS_StyleWise, PROC_*Receipt* | 22 cols / 106 files
```
```
Mas_Acc / Mas_AccDes - accessories item master + type/description master
  Acc   : Id PK; CatId -> Mas_AccCategory; UOMId -> Mas_UOM; HSNId; AccDescr; Divide_Factor?, Multiple_Factor?, Nodec?; BrandedFlag, UpdateFlg
  AccDes: Id PK (a.k.a. Ades/ADes); AccTypeID (a.k.a. Atype/AType); AccDescription; UpdateFlg
  top : Meet_Accessories, MeetAccDetails, SP_PartwiseRequirement | 10 + 4 cols / 36+29 files
```
```
Mas_UOM - unit-of-measure master
  cols: UOMId PK (a.k.a. Id); UOM (KGS/MTR/PCS); UpdateFlg
  top : SP_Vue_SalesInvoice_DC, Meet_Accessories, Accessories_Stock | 3 cols / 52 files
```
```
Mas_Season / Mas_Merchandiser - season and merchandiser masters
  Season: SeasId PK; SeasDesc; UpdateFlg (21 files) | Merchandiser: MerchId PK; MerchName; UpdateFlg (18 files)
  top : SP_Vue_OrderinHand*, SP_OrderHistoryLedger*
```
```
Mas_Godown / Mas_Fcy / Mas_Emp - godown, currency, employee masters
  Godown: GodId PK; GodName (10 files) | Fcy: Id PK (OrderMas.Fcy); FcyName, ExchangeRate (17 files)
  Emp   : Id PK (a.k.a. EmpId; Pcs_StockTable.EmpID); EmpName; Pid -> Mas_Party? (11 files)
  top : Sp_StockRpt, Sp_BIStockRpt / SP_Vue_Order_in_Hand* / SP_Vue_RptShiftWagesReg
```
```
Mas_HSN / Mas_State - HSN (GST) and state masters
  HSN  : Id PK (HSNId); HSNCode, HSNDesc, UnitRate?; BPerCH, BPerCL, NBPerCH, NBPerCL (GST % variants, meaning ?)
  State: Id PK (StateId); StateCode, StateName
  top : SP_VUE_DCYARN*, SP_Vue_SalesInvoice* | 8 + 3 cols
```
```
Mas_SalesGrp / Mas_User / Mas_AddDed - small config masters
  SalesGrp: CoyCode (+GrpCode?); Sales_Inv_Pcs_Prefix (pcs invoice numbering)
  User: UserCode, UserName (prepared-by refs); rest unknown | AddDed: AddDedCode PK?; AddDedName, Grp, IndexCode (bill charge codes)
  top : SP_Vue_SalesInvoice_Pcs, SP_PcsDcPrintQry, SP_BillsRegView_*
```
```
Mas_Component - fabric component master (body/collar/cuff panel components)
  keys: CompId PK (Pcs/Panel stock qty + Prog_ClrComb -> here); Id? (dup key ?)
  cols: CompDescr; FDia?; UpdateFlg
  top : SP_Fab_Wise_Program, Vue_GrnRegFab* | 5 cols / 8 files
```


```
OrderMas - export order header (one row per job)
  keys: OrdId int PK; JobNo; BuyOrdNo (buyer PO); FinYear char(2)
  refs: BuyerId, BuyerDeptId, MerchId, ExpId -> Mas_Exporter, Fcy -> Mas_Fcy.Id
  qty : OrderQty int, PcePerPack; money: Crate/ActCrate (contract/actual rate ?); dates: OrdDate, BuyOrdDt
  flag: Completed, Despatch_Completed, EntryOption, OrdType, GrpRef, Season?, CostName?, Uom?
  top : SP_Vue_Order_in_Hand_SaleRateWise* (244 refs/file), SP_Vue_OrderinHand* | 24 cols / 111 files
```
```
OrderMas2 - per-order commercial extension
  keys: OrdId + StyleNo; cols: Season1, Deldt, ActDeldt, Gsm, FwdCtRate, FabricName
  top : SP_Vue_OrderinHand* | 8 cols / 21 files
```
```
OrderStyleDtl - order-style dimension (styles within an order)
  keys: OrdId + StyleNo (natural key); StyleId -> Mas_StyleDesc; BrandId -> Mas_Brand?
  cols: SlNo, Deldt, EntryOption, Uom, PcePerPack, StyleQty, Rate, SaleRate, RateFor?, Fabric1, Itemtype, PrsId?
  acc : Acc_Desc/Acc_Type -> Mas_AccDes; Clr?, Siz?, ReqDQty; CP_Order_Completion, StyleWise_Despatch_Completion; UpdateFlg
  top : SP_Vue_OrderinHand*, PROC_Stock_IssueToPrdn_*_FINISH | 24 cols / 33 files
```
```
OrderQtyDtl - order qty per size (size ratio; optional lot/part/color split)
  keys: OrdId + StyleNo + SizeId (+LotNo varchar, +PartId, +ColId); StyleId; CmbClrId (combo color)
  qty : OrderQty, SizeQty, PcsPerColor, CutPlanQty, ProgKgs; Exs_Per (excess %)
  cols: DelDt, ProdUnit, SaleRate, CumulateRate?, FabricValue?; UpdateFlg, Size_UpdateFlg (SP_StyleChange renumber)
  top : SP_Vue_OrderinHand*, SP_FabReqCalc_Domestic_joborder | 21 cols / 64 files
```
```
OrdQtyClrDtl - order qty per color x size (color-wise ratio)
  keys: OrdId + StyleNo + LotNo + ColId + SizeId (+CmbClrId); StyleId
  qty : OrderQty, SizeQty, CutPlanQty; DelDt, Exs_Per, Prod_Unit, SaleRate; UpdateFlg
  top : SP_Vue_OrderinHand* | 16 cols / 20 files
```
```
OrdSizeMas - order size-ratio header (size sequence per order-style)
  keys: OrdId + StyleNo + SizeId; Sno (size order)
  top : MeetAccDetails, Vue_Dailyinout, SP_PartwiseRequirement | 4 cols / 17 files
```


```
Trs_Po1 / Trs_Po2 / Trs_Po3 - PO header / yarn lines / third table
  Po1: Id PK; CoyCode, FinYear, DocNo; MillId -> Mas_Mill; Fcy -> Mas_Fcy, ExchangeRate; Dept?
  Po2: Id -> Po1.Id; OrdId + StyleNo?; CntId -> Mas_Count, ClrId -> Mas_Color; PoQty, Rate
  Po3: Id + 1 col seen (role unconfirmed)
  top : MeetAccDetails, SP_OrderStatus_1/2/3 | 8 + 6 + 2 cols
```
```
Trs_Po5 - accessory/extra PO lines
  keys: Id -> Trs_Po1.Id?; OrdId + StyleNo; AType/Ades -> Mas_AccDes; Clr?, Siz?
  qty : PoQty, Rate, Amount, CancelKgs
  top : MeetAccDetails (132 refs), Meet_Accessories, SP_BilltoBeValue* | 10 cols / 25 files
```


```
Trs_Grn1 / Trs_Grn2 - fabric/yarn GRN header / lines
  Grn1: Id PK; CoyCode, FinYear, DocNo, Dt; Dept -> Mas_Dept.DeptID (verified); SubPrsId; SuppId -> Mas_Party; GodId
        StageId/TargetStageId -> Mas_JobWrkComp; OrdJob, OrdId, StyleNo; Invid, DCId?, ExpenseId?; PartyDCRef,
        External_GRNId, Knit_JobWrkId; Kgs, NetAmount; GrnType, ReceiptType, Type, ProcessType
  Grn2: Id = Grn1.Id; StockId -> StockTable; OrdId + StyleNo, LotNo, PartId, ColId, SizeId/SizId, DeptId?
        Poid -> Trs_Po1.Id, PoKgs, PoQty, TranOrdId; JobWrkId, JobWrkNo, Rowslno, PanelId
        qty: RecKgs, RecMtr, RejBag, RejKgs, RejMtr, RBag (returned bags), StockAddLess; Invid, FinalProcess, ActStockId, Clos, PartyId, Dt, FinYear
  top : SP_OrderStatus, Vue_StkLedger / MeetAccDetails, sp_fabricdet | 25 + 28 cols / 45+60 files
```
```
Trs_MultiPrs_Grn1 / Trs_MultiPrs_Grn2 / Trs_MultiPrs_Grn3 - multi-process GRN (one party DC, many legs)
  1: Id PK; CoyCode, FinYear, DocNo, GrnDate, Dt; Dept, SubPrsId, SuppId, Poid, DCId, VehicleCode; GrnType, ProcessType; PartyDCRef, PartyDCDate
  2: Id -> 1.Id (party/DC leg); DeptId, OrdId, PartyId, SuppId, OurDcId, DCId, StockId, DesignId, SubPrsId; RecKgs, RecMtr, RBag; FinalProcess, GrnType, DcClose
  3: Id -> 2.Id (stock lines); DeptId, OrdId + StyleNo, StockId, Invid, Poid, SubPrsId, Slno; RecKgs, RecMtr, RBag, DcBag, DcKgs, DcMtr; OrderwiseClose
  top : Vue_Dailyinout, SP_OrderStatus, Vue_TrsDc/Rec | 16 + 19 + 15 cols / 33+30+45 files
```


```
Trs_Del1 - process DC header (fabric/yarn/acc despatch to processor)
  keys: Id PK; CoyCode, ToCoyCode (unit transfer target), FinYear, DocNo, Dt
  dims: Dept, Prs_Dept (processing dept/stage), SubPrsId, DesignId, DyeColId -> Mas_Color, LotNo, GodId
  party/order: Party, PartyUnit -> Mas_Party; Buyer, BuyerId, BuyerDeptId; OrdId, OrdJobNo (OrdJob), StyleNo, Season, OrdDate
  refs: Invid?, OurGrnId?, PrdId?, GPNo (gate pass), EwayBillNo/Dt, VehicleCode, PreparedBy, Remark, DelWgt, Tardt, Yf
  flags: TrType, DelType, ProcessType, Clos
  top : Vue_StkLedger, MeetAccDetails, TRG_FAB_BALANCE_DEL | 40 cols / 67 files
```
```
Trs_Del2 - DC fabric lines (kg/mtr + rates + accepted qty)
  keys: Id = Trs_Del1.Id; StockId -> StockTable; OrdId + StyleNo
  xref: TranOrdId, TranStyleNo, TranId (transfer linkage), SuppOrdId, JobOrdId, Invid?
  qty : Kg, Mtr; Aid?/Akg/Amtr/Arl (accepted/adjust qty), Bgrl (bags-rolls); Rate, RateUOMId, StkRate_DC, TotBudAmt?, TotRecKgs?; OrdwiseClose
  top : MeetAccDetails (160 refs), VUE_STOCKDTDATE, SP_Vue_SalesInvoice_DC | 21 cols / 100 files
```
```
Trs_Del3 - DC line fabric spec snapshot (grey/finish knit params)
  keys: StockId -> StockTable; OrdId + StyleNo; Id
  spec: Cnt, Clr, DiaId, FinDiaId, GG, Gsm, LL, FabType, LotNo, Prog?, PrgKnitDiaId, PrgKnitGsm, Print_DesignId, GeneralRate
  top : SP_OrderStatus_1/2, VUE_DEL_PRSRT | 16 cols / 10 files
```
```
Trs_Del4 - DC line GST percents
  keys: StockId, DCId -> Trs_Del1.Id; HSNId -> Mas_HSN.Id; CgstPer, SgstPer, IgstPer
  top : SP_Vue_SalesInvoice* | 6 cols / 48 files
```


```
Trs_ReadyToCut1 / Trs_ReadyToCut2 (+ Trs_ReadyToCut_Ret1 / Trs_ReadyToCut_Ret2) - ready-to-cut issue to cutting (+ returns)
  1: Id PK; CoyCode, FinYear, DocNo, Dt; Prs_Dept, Party, GodId, DyeColId, PrdId?, Dept?; TrType
  2: Id = 1.Id; StockId -> StockTable; OrdId + StyleNo; TranId, TranOrdId, TranStyleNo
     qty: Kg, Mtr, Aid?, Akg, Amtr, Arl, Bgrl, StockAddLess, RUpdtKg, RUpdtMtr
  Ret2: Id, OrdId, StyleNo, StockId (return variant, few cols seen)
  top : TRG_FAB_BALANCE_RCUT*, sp_knitdetail, sp_Collar | 12 + 15 cols / 32+68 files
```
```
Trs_CutApr - cutting approval register
  keys: Id PK; CoyCode, FinYear, AprNo, AprDt; GodId
  top : VUE_STOCKDTDATE, Vue_StkLedger, CutACKStockPost | 6 cols / 18 files
```


```
Trs_ProdEntry - stage production entry header (pieces produced at a stage)
  keys: Id PK (shared by qty + source-stage tables); CoyId (a.k.a. CoyCode); OrdId + StyleNo + PartId + StageId -> Mas_JobWrkComp.Id
  dims: ClrId -> Mas_Color, LotId -> Mas_Lot.LotSno, LotNo, GodId, StyleId, SourceStageId -> Mas_JobWrkComp
  oper/money: EmpId -> Mas_Emp.Id, HrsId?, WrkId -> Mas_JobWrkComp (rate lookup), Brid?, CuttingId?; Rate, JobWrkRate, AddRate, Pay?; Dt, SNo, PreparedBy
  flags: Rework (0/1), StockPostingFlg (0 = not yet posted)
  top : PROC_Stock_ProdPieces_Delete1* (107 refs), PROC_Stock_ProdPieces_Update* | 30 cols / 101 files
```
```
Trs_ProdEntryQty - production entry qty per size
  keys: Id = Trs_ProdEntry.Id; SizId -> Mas_Size; ColId?; OrdId + StyleNo
  qty : ProdPcs int, Rate, Mtr, NetAmount; Dept, Part?, MasterOrderId?, OrderID?, PanelId, BundleId, BundleMasId, CoyCode
  top : Vue_PcsStockDtl_PART, SP_Vue_Rpt_OverallProduction_Det, Sp_ProductionEntryQty_* | 16 cols / 37 files
```
```
Trs_ProdEntry_SourceStageDtl - source-stage consumption detail per entry
  keys: Id -> Trs_ProdEntry.Id; PartId, SourceStageId -> Mas_JobWrkComp, ColId
  top : PROC_Stock_ProdPieces_Delete*, PROC_Stock_IssueToPrdn_* | 4 cols / 54 files
```
```
Trs_AddPanelEntry / Trs_AddPanelEntryQty / Trs_AddPanelAsm_SourceDtl - panel (sub-assembly) production
  Entry: Id PK; CoyId; OrdId + StyleNo + PartId + StageId; ClrId, LotId/LotNo, GodId, StyleId; Rework, StockPostingFlg
  Qty  : Id = Entry.Id; SizId; ProdPcs; Clr, Panel, Part, Unit? (+ variants _Component, _Det, _WithComponent)
  Asm  : Id -> Entry.Id; PartId, CompId -> Mas_Component, SourceStageId (assembly consumption)
  top : PROC_Stock_ProdPanel_*, Sp_ProductionEntryQty_Panel* | 14 + 8 + 4 cols / 91+23+9 files
```
```
Trs_LineInput (+_Det) / Trs_LineTfr - issue to sewing line / line-to-line transfer
  both: Id PK; CoyCode, OrdJobNo, GodId, TargetStageId -> Mas_JobWrkComp (+ Det: Id, PartId, ColId)
  top : PROC_Stock_IssueToPrdn_* / PROC_Stock_LineTfr_* | 5 cols each / 32+20 files
```


```
Trs_Pcs1 / Trs_Pcs2 - piece DC header / lines (panel or finished pcs despatch)
  1: Id PK; CoyCode, ToCoyCode, FinYear, DocNo, DtDcDate; OrdJobNo (order-style composite), OrdJob, OrdId, StyleNo
     Dept, Part/PartId, Clr/ClrId, CmbClrId, GodId, TargetStageId + SourceStageId -> Mas_JobWrkComp
     Party, Buyer, Invid, JRate?, Nobdl (bundles), PcsPanel, Wgt; VehicleCode, TransportationMode, EwayBillNo/Dt, PreparedBy, Remark
     DelType, Despatch_Type, ProcessType, RejectionTypeId, Clos, Uom
  2: Id = Pcs1.Id; StyleId, StyleNo, ColId, SizeId, PartId, CompId -> Mas_Component, PanelId -> Mas_Panel
     LotNo, PoNo?, Pcs, Rate, Crate?, SrcLineID (owning line/emp), SourceStageId
  top : SP_BudAndActual_Det* / PROC_PanelReceipt_Insert | 40 + 18 cols / 68+158 files
```
```
Trs_PcsGrn1 / Trs_PcsGrn2 / Trs_PcsGrn3 (+Trs_PcsGrn4_PackingDcDet) - piece GRN set
  1: Id PK; CoyCode, FinYear, DocNo, Dt, Dept, GodId; OrdJob, OrdId, TargetStageId, TranOrdId, SuppOrdId
     Party, OurDcRef, PartyDCRef, Invid; GrnType, ProcessType; Pcs
  2: Id = 1.Id; OrdJobNo, OrdId + StyleNo, PartId, CompId, ColId, SizId, LotNo, StyleID
     qty: RecPcs (+RecPcs1), RejPcs, RewrkPcs; StockId?, PanelId, PanelGrp?, Prs_Dept, TrType
  3: Id -> 2.Id; StageId (stage-wise receipt detail)
  4 : packing-DC detail (Id, DCId, DcStageId, StyleNo, PartId, ColId, SizeId); "Trs_PcsGrn4" in queries is an alias
  top : PROC_PiecesReceipt_*, PROC_PanelReceipt_* | 17 + 18 + 2 + 7 cols
```
```
Trs_PcsRej - piece rejection entry
  keys: Id PK; CoyId; OrdId + StyleNo + PartId + StageId; ClrId, StyleId, Stk_StageId (stock stage); GodId
  refs: RejectionTypeId -> Mas_RejectionType
  top : PROC_Stock_ProdRej_Insert/Delete_(Finish|Line) | 11 cols / 14 files
```
```
Trs_UnitAck1 / Trs_UnitAck2 - unit (factory) receipt acknowledgement
  1: Id PK; CoyCode, GodId (+OrdJobNo?)
  2: Id / TransId -> UnitAck1.Id; StyleNo, StyleId, PartId, ColId, SizeId, CompId, PanelId, LotNo; Pcs; SrcLineID
  top : PROC_UnitAck_*, PROC_UnitAckLineStk_* | 4 + 11 cols / 33 files
```


```
Trs_Bills / Trs_BillRate - supplier/job-work bill header / rate lines
  Bills   : Id PK; CoyCode, CoyId?, FinYear; BillNo, BillDt, BillType, Type; Party -> Mas_Party; OrdJob, OrdId, StyleNo, PartId
            Poid -> Trs_Po1.Id, StageId/TargetStageId, EmpId, BrNo, BrDt (bank ref), GrpCode; BillAmt, TDS_Percent, TDSAmount, ERN?
            PassFlg (passed for payment), ReceiptType; PreparedBy, Remarks
  BillRate: Id -> Bills.Id; OrdId + StyleNo; Dept -> Mas_JobWrkComp.Id (verified), StageId
            dims: StockId, Poid, PartId, PanelId, CompId, ColId, CntId, FabId, MillId, DesignId, DiaId, SizeId/SizId, StyleId
            acc: AType/Ades -> Mas_AccDes, ASize, Acc_StyleWise?; qty: Kgs, Mtr, Rls; Rate, Amount, NetAmount, TaxPer, TaxAmt
  top : Vue_InputGST / SP_BudAndActual_Det (176 refs) | 26 + 29 cols / 33+60 files
```
```
Trs_Deb1 / 2 / 3 / 4 - debit note sets (header + lines + variants)
  1: Id PK; OrdId + StyleNo; DeptId/Dept, Prs_Dept, StageId, SubPrsId, ExpenseId?, SuppId, BrnId?; Fcy
     dims: CntId, FabId, ColId/ColorId, PartId, Siz; Kgs, ActualQty/Amt, BudgetQty/Amt, DebitValue, NetAmount; ADES/ATYPE/ASIZ, AccDesc, AccTypeID
  2: Id -> Deb1.Id; DeptId, DeptName?; OrdId + StyleNo; CntId/CountId, FabId, ColId/ColorId, PartId, Partdesc?, PrsId, StockId
     DebKg, Rate, ActualQty/Amt, BudgetQty/Amt, NetAmt; Clr, Siz, Sizedesc, AccDesc/AccTypeID
  3: Id, OrdId, StyleNo, NetAmt (summary) | 4: acc debit (Id, OrdId, CntId, ColorId, DeptId, FabId, PartId, StockId, ActualQty/Amt, AccDesc, AccTypeID, Cid?, Partdesc, Sizedesc)
  top : SP_BudAndActual_Det*, SP_DEBITQRY* | 36 + 36 + 4 + 17 cols
```
```
Trs_SalInv - sales invoice header
  keys: Id PK; CoyCode, FinYear; InvNo, Inv_Prefix -> Mas_SalesGrp, InvDt, InvType
  refs: Party -> Mas_Party, PartyType; VehicleId -> Mas_Vehicle; DelAt; ReverseCharge, TransportationMode; Remarks
  top : SP_Vue_SalesInvoice* (47 refs) | 15 cols / 36 files
```
```
Trs_ProdWages - shift wages register
  keys: Id PK; CoyCode; OrdId + StyleNo; DeptId, Dept, StageId, PartId; EmpId -> Mas_Emp; EntryDate, DetSlno, Slno
  qty : ProdPcs, Qty, Pcs, Kgs, Rate, Amount, Amt, NetAmount, ActualQty, ActualAmt; NoofStyleNo, No_Of_Persons, ShiftWages
  acc : Acc_Desc, Acc_Type, Clr, Siz, CntId, ColId, FabId, PrsId; TransStyleNo
  top : SP_Vue_RptShiftWagesReg (48 refs) | 32 cols / 39 files
```
```
Trs_Shortage - shortage register (short receipt vs PO/requirement)
  keys: OrdId + StyleNo; Dept, CntId, ColId; AType/Ades -> Mas_AccDes, ASiz; ShortKgs
  top : MeetAccDetails (78 refs), Vue_YarnProgBalDetail* | 8 cols / 20 files
```


```
StockTable - yarn/fabric/accessory stock ITEM DIMENSION (not quantities)
  keys: StockId int PK (app-assigned surrogate; every kg/mtr movement line carries it)
  dims: OrdId + StyleNo (order-scoped), LotNo, CoyCode?, Yf (yarn/fabric class flag)
        yarn: CntId, MillId | fabric: FabId, DiaId, FindiaId, PrgKnitDiaId, PrgKnitGsm, GG, LL, Gsm, FinGsm?, FabType, Print_DesignId
        color: ColId, CmbClrId? | acc: ADES/ATYPE -> Mas_AccDes, Siz
  other: PartId?, CompId?, SubPrsId?, DeptId?, DesignId?, Rate, YarnLotOrdId?, FrmStockId? (transformed-from stock)
  top : MeetAccDetails (336 refs), SP_OrderStatus, Proc_Rpt_OCR_Summary* | 44 cols / 140 files
```
```
CurrentStock - LIVE fabric stock qty per stock cell + godown
  keys: StockId -> StockTable; OrdId + StyleNo; GodId -> Mas_Godown
  qty : Kg, Mt (metres), Bg (bags?)
  NOTE: maintained ONLY by app-side proc Sp_currentstock (NOT in corpus); Trg_CurrentStock_Update sets UpdateFlg. See section 5.
  top : Sp_BIStockRpt, Sp_StockRpt, MeetAccDetails, FabDeliverySP | 7 cols / 29 files
```
```
CurrentStock_RollDtl - roll-wise fabric stock (owned by Sp_currentstock_RollDtl, on disk)
  keys: Ordid + StockId + StyleNo + RollId; Frm_StockID (source cell for transfers)
  qty : RollKgs numeric(18,3), RollMtrs numeric(18,2)
  NOTE: @type '+'/'-'; DeptId=-7 = transfer with FromStockId; DeptId=11 = rejection path; Delflg 'N' = decrement else delete row.
  top : Sp_currentstock_RollDtl | 7 cols / 8 files
```
```
StockRatePost - cumulative billed rate per stock cell
  keys: OrdId + StyleNo; StockId?; DeptId, FabId, CntId, ColId, DesignId, SizeId, AccDescId?, AccTypeID?
  qty : BudRate, CumBillRate (UPDATE target of trigger Tgr_StockRatePost, 72 updates)
  top : Tgr_StockRatePost, SP_BudAndActual_Det_1 | 12 cols / 35 files
```
```
PcsStockRatePost - pcs valuation rates (WIP/FG pcs costing)
  keys: Id?; Coycode; OrdId + StyleNo; DeptId, DeptSlno?, StockId?, StageId, SeqNo
  qty : BillRate, BudRate, CumulateRate, Rate, StockRate, CutGrammage, FabricValue, OvrallAccValue_ForPcs
  top : SP_PcsValue*, PartyOutQry | 17 cols / 34 files
```
```
Pcs_StockTable / Pcs_StockTableQty - piece stock header (per stage) / qty per color-size
  header: PcsStockId PK (app-assigned Max(IsNull(PcsStockId,0))+1, NOT identity); CoyCode; OrdId + StyleNo
          + StageId -> Mas_JobWrkComp + PartId; LotID -> Mas_Lot.LotSno; GodId, PartyId (0 normal?), SeqNo -> Prod_Sequence
          EmpID: 0/null = warehouse row; <>0 = line-held stock (doubles as SrcLineID domain)
  qty   : PcsStockId -> header; ColId + SizeId; StockQty (good), GoodPcsFlag 'G'/'M', RejectionTypeId
          ProductionQty, RejStk, RewrkStk (int pcs buckets; upsert on PcsStockId+ColId+SizeId+GoodPcsFlag+RejectionTypeId)
  top : PROC_PiecesReceipt_*, PROC_Stock_ProdPieces_* | 11 + 11 cols / 250+ files
```
```
Panel_StockTable / Panel_StockTableQty - panel stock header / qty (mirror of Pcs stock)
  header: PcsStockId PK; CoyCode; OrdId + StyleNo + StageId + PartId; LotId, GodId, PartyId, SeqNo
  qty   : PcsStockId; ColId + SizeId + CompId -> Mas_Component; StockQty, GoodPcsFlag, RejectionTypeId, ProductionQty
  top : PROC_PanelReceipt_*, PROC_Stock_DeliveryPanel_*, PROC_Stock_ProdPanel_* | 10 + 8 cols / 120+ files
```


```
ST_ProgBalance_Yarn - yarn requirement-vs-movement balance (TRG_YARN_BALANCE_* triggers)
  keys: OrdId + StyleNo; CountId, ColId, DeptId
  qty : GrnKgs, DcKgs, ReqBalanceKgs; ActualPosting_UpdateFlg, UpdateFlg
  top : TRG_YARN_BALANCE_*, Trg_ST_ProgBalance_Yarn_Update | 9 cols / 4 files
```
```
ST_ProgBalance_Fabric - fabric requirement-vs-movement balance (TRG_FAB_BALANCE_* triggers)
  keys: OrdId + StyleNo; DeptId; FabId, CntId, ColId, DesignId, FindiaId, FinGsm, LL
  qty : ReqKgs, ReqMtr, GrnKgs, GrnMtr, DcKgs, DcMtr, ReprocessDcKgs, ReprocessDcMtr, ReturnKgs, ReturnMtrs; ActualPosting_UpdateFlg, UpdateFlg
  top : Sp_st_Prog_fabric, TRG_FAB_BALANCE_DEL, SP_RtoCut | 23 cols / 6 files
```
```
ST_PartyBalance_Abs - party abstract balance (DC side vs GRN side rows; rebuilt by Sp_POBalnce)
  keys: PartyId -> Mas_Party; Ordid, Deptid, Styleno; BuyordNo, JobNo, IOFinYear
  cols: DcNo, DcDate, DcItemDesc, DcQty, DcMtr, DcBgRl; GrnItemDesc, GrnQty, GrnMtr, GrnBgRl; GRNUOM, DCUOM; UpdateFlg
  top : Sp_POBalnce, Trg_ST_PartyBalance_Abs_Update | 17 cols / 2 files
```
```
ST_Acc_PartyBal_Abs - accessories party balance abstract (rebuilt by Sp_Acc_PartyBalance)
  keys: Acc_Id?; PartyID, Ordid, Styleno, Deptid
  cols: PO_Dc_NO, PO_DC_ItemDesc, PO_DC_Qty, PO_Dc_Date; GRN_ItemDesc, GrnQty; GRNUOM, DCUOM; Poflg; UpdateFlg
  top : Sp_Acc_PartyBalance, Trg_ST_Acc_PartyBal_Abs_Update | 14 cols / 3 files
```
```
ST_Acc_Prog_Balance - accessories program balance (maintained by Sp_AccTransaction, 72 refs)
  keys: Ordid + Styleno; Atype/Ades/Asize/Acol -> Mas_AccDes dims
  qty : POQty, ReqQty, RECQty, RETQty, ProRecQty, ProRetQty, DelQty, OpenQty, ShortQty, TranInQty, TranOutQty; ActualPosting_UpdateFlg, UpdateFlg
  top : Sp_AccTransaction, Trg_ST_Acc_Prog_Balance_Update* | 23 cols / 23 files
```
```
ST_Production_Data - production progress snapshot per order-style-stage
  keys: Coycode; Ordid + Styleno; StageID, PartID, ColID, SizeID, PartyID?
  qty : OrderQty, OrderWithExsQty, OverallOrdQty, ProdQty, GRNQty, DCQty, RejQty, ReworkQty
        Finish_Percent, Finish_Percent_4Exs; UpdateFlg (SP_ST_Production_Data / Sp_WBS_Production)
  top : Sp_WBS_Production (60 refs), SP_ST_Production_Data | 21 cols / 5 files
```
```
ST_Ord_inHand - order-in-hand snapshot (rebuilt by Sp_MR_OrdInHand)
  keys: OrdId + StyleNo; BuyerId, BuyerDeptId, MerchId, SeasonId, FcyId; LotNo
  qty : OrderPcs, OrderPcs_WithExs, SaleRate, DespatchPcs, DespatchValueINR, DespatchValue_inFCy; ExRate; OrdDt, DelDt; OrderUOMId; Completed
  top : Sp_MR_OrdInHand, Trg_ST_Ord_inHand_Update | 19 cols / 8 files
```
```
WBS_Production / WBS_Production_DateWise - work-breakdown progress board
  WBS     : OrdId + Styleno; StageId, DeptId, Dept, PartId, SeqNo; OrderQty, OrderWithExsQty, ProdQty, DcQty
            PlanStart, PlanFinish (via WF_PlanFinishDateArrival), BgColor?; ActualPosting_UpdateFlg
  DateWise: + ProdDate, LineID; ProdQty, DcQty, BudgetRate, BudgetCost, BudgetAmt; UpdateFlg
  top : Sp_WBS_Production(_DateWise), Trg_WBS_* | 15 + 19 cols
```


```
Pay_CuttProdMas / Pay_CuttProd_Bundle - cutting production master + bundles
  Mas    : Id PK (= Pay_BarcodeGeneration.BundleMasID); StyleNo, ColId, PartId
  Bundle : Id -> Mas.Id; BundleId, SizeId; GoodPcs, RejectionPcs; Completed, LineId, LineIssDt
  top : SP_Vue_PRodStatus, SP_PcsBarcode_Check*, SP_Barcode_Production_Posting | 5 + 9 cols
```
```
Pay_BarcodeGeneration - bundle barcode generation
  keys: BundleMasId -> Pay_CuttProdMas.Id; BundleId -> Pay_CuttProd_Bundle; PcsBarcode
  cols: GoodPcs, Completed, LineId, LineIssDt, StyleNo
  top : SP_PcsBarcode_Check, SP_BundleBarcode_Check | 9 cols
```
```
Pay_BundlePcs_Barcode - per-pcs barcodes within bundles
  keys: BundleMasId + BundleId; PcsBarcode, Barcode
  cols: Pcs, CoyCode, EmpId, HrsId, StageId, SourceStageId, ProdDate, ProdId?, PostingFlg
  top : SP_PcsBarcode_Check, SP_Barcode_Production_Posting | 12 cols
```
```
Pay_Bundle_ProdEntry - bundle production posting flag table (only PostingFlg visible in corpus) | 1 col
```
```
Pay_Pcs_ProdEntry - per-scan pcs production entry
  keys: ID PK; Coycode, Finyear; BundleMasId + BundleId; Barcode
  dims: OrdId?, StyleNo, StyleId, PartId, ClrId, LotNo; StageID, SourceStageId; EmpId, LineId, HrsID, TimeRangeID
  qty : Pcs; ProdDate, EntryTime; WorkType, ProdOutput_FinalOutput?, RejectionTypeID, ReWorkFlg, ReworkApproval; PostingFlg
  top : SP_PcsBarcode_Check*, SP_Vue_PRodStatus, SP_Barcode_Production_Posting | 25 cols
```
```
Pay_Bundle_IsstoLine - bundle issue-to-line register
  keys: ID PK; BundleID + BundleMasID; Barcode; IssDt, LineID
  top : SP_BundleBarcode_Check | 7 cols
```


```
Pro_ReqYarn / Pro_ReqYarn2 - yarn requirement header / rated detail
  ReqYarn : OrdId + StyleNo; DeptId; CountId, ColId; ReqKgs, ShortKgs; FabToYarn_Flag
  ReqYarn2: OrdId + StyleNo; DeptId; CntId/CountId, ColId, FabId, DesignId, DiaId, FindiaId, GG, Gsm, FinGsm, LL
            Qty, Rate, AddRate, PrslossPercet?, SubPrsId?
  top : SP_BudAndActual_Det_1, SP_FabReqCalc_Domestic_joborder | 7 + 14 cols
```
```
Pro_ReqKnitt / Pro_ReqKnitt2 - knitting requirement header / rated detail
  ReqKnitt : OrdId + StyleNo; DeptId; CntId, ColId, FabId, DesignId, DiaId, FindiaId, FinGsm, GG, Gsm, LL
             ReqKgs, ReqMtr, ShortKgs, ShortMtr; ConsId?, SubPrsID, RepeatedLen, Prg_Comments, Slno
  ReqKnitt2: same dims + HSNId; Rate, RateUOM, AddRate, Cost, PrslossPercet; CGSTPer, SGSTPer, IGSTPer
  top : SP_BudAndActual_Det_1 (76/174 refs per file), SP_BilltoBeValue* | 18 + 26 cols
```
```
Pro_ReqJob (+_1, _temp) - generic job-work requirement rows
  keys: OrdId + StyleNo; DeptId; FabId, CntId, ColId, DesignId, FindiaId, FinGsm, LL (+_temp: ReqKgs/ReqMtr staging)
  top : SP_StyleChange, SP_FindReqData1/2 | 12 cols
```
```
PRO_AccReq - accessories requirement per order-style
  keys: OrdId + StyleNo (+LotNo); Acc_Type/Acc_Desc -> Mas_AccDes; Clr, Siz, Slno
  qty : OrdQty, Req, ReqDQty, Pcs, Excess; PrsId?; ItemType, ItemBlockin_PO, PurchaseType
  top : MeetAccDetails (66 refs), SP_PartwiseRequirement (51 refs) | 17 cols / 79 files
```
```
Prog_ClrComb - garment program: color combos + fabric spec per component
  keys: Id PK; OrdId + StyleNo; ClrCombId?; CompId -> Mas_Component, CompGrdSlno, PartId, SlNo
  spec: FabDesc, FabClr, GreyGsm, FinalGsm, FinCnt, FinCol, GG, LL, Yd (yardage/yarn-dye?), WtUOM, LooseFab
        PExc? (excess %), Overdyeing, Component_Block, Prs, YClr, Dept?, StockId?, Ordsheet_ClrCombId?
  top : SP_FabReqCalc_Domestic_joborder (324 refs), SP_ConsQuery2* | 27 cols / 151 files
```
```
Prog_Cns - program consumption (piece weights, dia widths per size row)
  keys: Id -> program; OrdId + StyleNo; ColId, CompId, CompGrdSlno, PartId, Prs?, Yd, SizId
  spec: Kdia, LDia, FDia, FabWidth, NoofPiece, PcsWgt, ActPcsWgt, Loss_Per; ColorDesc, CompDescr
  top : SP_FabReqCalc_Domestic_joborder, SP_ConsQuery2* | 18 cols / 78 files
```
```
Prog_Prsloss - process loss % per process/component (Prog_Clrloss referenced, cols unseen)
  keys: Id; OrdId + StyleNo; ClrCombId -> Prog_ClrComb, CompId, CompGrdSlno, PartId, Prs, SubPrsId
  qty : Loss_Per, WtUOM; YClr, ColId, CountId, Colordesc, Countname, CompDescr, Fincol
  top : SP_FabReqCalc_Domestic_joborder, SP_Fab_Wise_Program | 20 cols / 41 files
```
```
Pro_RateCnfPcs1 / Pro_RateCnfPcs2 - piece-rate confirmation (quotation / stage-part rates)
  1: Id PK; FinYear, QuotNo, PartyId -> Mas_Party | 2: Id -> 1.Id; OrdId + StyleNo, PartId, StageId -> Mas_JobWrkComp; Rate
  top : SP_PendingRateCnf, SP_ApprovedRateCnf1 | 5 + 6 cols
```
```
Pro_Prod_PartwiseRate / Trs_ProdExp - confirmed part-wise production rates / job-work rate exceptions
  PartwiseRate: OrdId + StyleNo + PartId; WrkId -> Mas_JobWrkComp.Id; JobWrkRate, Rate, AddRate, Rate_Pcs, Cost
                OrderQty, OrderQtyExcess, Nwork?
  ProdExp: OrdId + StyleNo + WrkId; DeptId; Rate, JobWrkRate, AddRate
  top : VUE_RPT_BUDABS_StyleWise, SP_VUE_DCYARN*, SP_BilltoBeValue_Detail | 11 + 9 cols / 64 files
```


```
Prod_Sequence - stage sequence per order-style (the manufacturing route order)
  keys: OrdId + StyleNo + StageId -> Mas_JobWrkComp.Id; SeqNo (copied to Pcs_StockTable.SeqNo, WBS_*.SeqNo)
  top : PROC_Stock_ProdPieces_Update*, PROC_PanelReceipt_Update, PROC_GodownAck_Insert | 4 cols / 87 files
```
```
OrdSeq - older dept/process order map (requirement-calc reports)
  keys: OrdId; Sl (dept order), Prs (process order)
  top : SP_FabReqCalc_Domestic_joborder, Proc_Rpt_OCR_Summary* | 4 cols / 47 files
```
```
Options / Options1 - application config (wide row(s); `From Options` / `From Options1`)
  cols seen: Allow_Excess_InBudget, GatePassFlg, Stitching_DeptCode, CostCalc | rest never named in corpus (section 5)
  top : VUE_RPT_BUDABS_StyleWise, SP_BudAndActual_Det*, PROC_Stock_*
```
```
PartDefine (+_Duplicate) - component grade definition per order-style
  keys: OrdId + StyleNo; CompId -> Mas_Component; GrdSlno
  top : SP_CpyPrgmDet, SP_PcsValue*, SP_StyleChange | 4 cols / 3 files
```
```
Trs_ContractorAllotment_Mas / Trs_ContractorAllotment_Det - contractor line/stage allotment (cols mostly unseen)
  Mas: OrdId + StyleNo | Det: LineID, StageID -> Mas_JobWrkComp, ContractorId -> Mas_Party.Pid
  top : SP_StyleChange (Mas), SP_PcsBarcode_Check (Det)
```
```
GovtHolidays - government holiday calendar
  cols: GHDate (only column compared; holiday name unseen)
  use : WF_PlanFinishDateArrival(@Date,@Days,@flg) computes working days (skips Sunday WeeklyOff=1 "from Options" + GHDate) for WBS PlanFinish; also Sp_DailyUnitPANDL.
```
```
Trs_StyleChangeLog - audit log for style-no renames
  cols: Id (identity, per commented CREATE TABLE in SP_StyleChange), Dt, Ordid, Styleno, NewStyleno, UserId
  use : SP_StyleChange rewrites StyleNo across 30+ tables and logs here.
```

## 3. Remaining tables (compact)

Supplier-side mirrors (maintained by Supp_* procs, partially on disk): SuppPcs_StockTable (7) / SuppPcs_StockTableQty (8), ST_Supp_Production_Data (5), WBS_Supp_Production (1), WBS_LineProduction (1), Supp_Prod_Sequence (2), Trs_SuppProdEntry (9), Trs_SuppProdEntry_SourceStageDtl (3), PcsStockRatePost_All (10), PcsStockValue (3), SuppOrdMas/Det/StyleDtl/Image, SupplierStock (6), SuppAccDet/AssortDet/CommDet, Supplier_Transaction1 (4).

Persistent tables (name - purpose from usage - cols seen):

| Table(s) | Purpose | Cols |
|---|---|---|
| Acc_OrderQtyDtl / Acc_OrdQtyClrDtl / Acc_PO_HSN_Detail | accessories order-qty mirrors; PO HSN/GST detail | 1/1/5 |
| App_ApprovalDC / _Plan / _Sent, App_CourierMas | approval workflow docs/plan/notifications; courier | 2/9/11/1 |
| AssQty_Multiple; Bud_InhRateClw; Budget_CostFix_Det; BudPoMas / BudPoDet | work tables: assorted qty, budget rates, cost fix, budget PO | 10/8/2/5/17 |
| Commodo_Order_Img, JobOrderImage, OrderStyleImage* (4), OrderAccImgDtl | image storage | 1 |
| Cutting_Job / _Dtl; Production_Started_Old_OrderList | cutting jobs; started-old-order flags | 8/6/1 |
| DailyStockReg, GrnPcsWgt, IE_Input, EnquiryDet, TestMas, Dpl, Ord_GramDtl, OrdStyle, Lot_GrpOrd_Det, ShadeEntry, StyleWise_OrderQty, Prod_Slno, Prod_Source_Operation, Prod_PcsRworkIssue, Pcs_RejStockTable, PrePrint, PrgSample_Final_Fab_Det / Process_Route, PO_Dtl_ArticleNoPopNo / DetailedClrDesc / SkuCodeClrSizeWise | 1-col registers/work/print variants | 1 |
| DailyUnit_P_and_L / _Abs | daily unit P&L + abstract | 17/14 |
| FinanceYear; Print_Design | financial year master; print design master (StockTable.Print_DesignId) | 1 |
| LabTestMas / LabTestGrpMas / LabTestGrpDet | lab test master/groups | 8/15/6 |
| Mas_AccCategory, Mas_Bank, Mas_BitSize, Mas_Brand, Mas_Commercial, Mas_Expenses, Mas_FabricGroup, Mas_Grp | small masters | 3/4/1/2/4/2/1/2 |
| Mas_HSNPce, Mas_LabTestParameters, Mas_LabTestStages, Mas_Panel, Mas_RejectionType, Mas_StyleGroup, Mas_StyleNo, Mas_SubProcess, Mas_Terms, Mas_Vehicle, Mas_Voucher_PaymentType, Mas_YarnCountGroups | small masters (contd) | 2 |
| Order_Addl_Color / _CompDet / _Lot / _RatioDtl / _Size; OrderQtyDtl_Amend, OrdQtyClrDtl_Amend; OrderLotRateDtl, OrderProgQty, OrdProgPcsWgt | order amendment/program extras | 1 |
| Order_PartDtl; OrderStyleWiseCost / _Grp; Pay_ProdWorkDetails | part detail; style costing; payroll detail | 5/2/3/1 |
| Payment_OrdTransferDtl / PaymentDtl / PaymentMas | payments transfer/lines/header | 2/3/5 |
| Pro_AccBudRate; Pro_AccJobReq (+Vue_Pro_AccJobReq 9); Pro_AccReq_ComboWise / _GreyClrDtl | acc budget rates / job requirement / variants | 18/1/1 |
| Pro_BudCommercial; Pro_Prod_BitCutRate; ProProdBitCutDet; Pro_Prod_Budget_Det; Pro_Prod_PanelWiseRate; Pro_ProdPros | budget/rate work | 6/3/5/2/1/6 |
| Pro_ReqActual; Pro_ReqJob_1 / _Temp; Pro_ReqKnitt_ComboWise / _Det / _Duplicate; Pro_ReqYarn_ComboWise / _Det / _Duplicate | requirement variants (style-change working copies) | 1/1/16/17/1/26/7/1/11 |
| Pro_YrnCns; Prog_AccMas; Prog_ClrDtl; Prog_Comments; Prog_DiaChange; Prog_InputPanels; Prog_PanelEntry | program work tables | 5/1/1/1/2/4/2 |
| Prog_ClrComb_Duplicate; Prog_Cns_Duplicate; Prog_Component / _Duplicate; Prog_Design / _Duplicate; Prog_YCns / _Duplicate; Prog_YTwist_Mas / _Dtl; Prog_ReqCaltWrk | program copies / requirement calc work (22 files) | 26/15/4/5/2/2/2/2/2/2/22 |
| SewingOprBdImage; SewingReq1 / 2 / 3 | sewing requisition set | 1 |
| Ship_InvDet / Ship_InvMas; ShippingBill / _Det / _TaxDet | shipping invoice + bill sets | 2/4/4/3/3 |
| ST_Cost_Dept / _Factory / ST_Cost_OrderDtl; ST_DailyCostingInputData; ST_ProdRequirement | costing rollups | 4/3/3/3/3 |
| TempSchedule; Trs_Schedule; VW_Trs_ScheduleNew | production scheduling set | 6/8/6 |
| Trs_AccSchedule; Trs_Certificate | acc delivery schedule; certificate register | 1/3 |
| Trs_AddPanelEntryQty_Component / _Det / _WithComponent | add-panel qty variants | 7/2/3 |
| Trs_BillAddDed; Trs_BillDeb1 / 2; Trs_DirectDeb1 / 2; Trs_JwrkInvAddDed; Trs_SalInvAddDed | bill add-ded lines / debit note sets | 24/4/8/4/4/3/3 |
| Trs_ContractorBal; Trs_CuttingShortage; Trs_Desp_Rate; Trs_Expenses; Trs_StyleWiseSingleExpense | contractor / expense work tables | 1/1/2/4/1 |
| Trs_DailyPrdn_Costing1 / _5 | daily production costing | 3/7 |
| Trs_FabAllot1 / 2; Trs_FinishedGoods1 / 2; Trs_Gen1 / Trs_Gen2 / Trs_GenGrn1 / Trs_GenGrn2 | allotment, finished goods, general DC/GRN pairs | 3/19/8/3/7/4/8/4 |
| Trs_GrnWaste2; Trs_HotProcessRate; Trs_InAccDel2; Trs_InFabDel2; Trs_InFabDel_Ret2; Trs_Inv_DomesticDet | waste, hot process rates, internal delivery, domestic inv | 1/6/2/2/2/1 |
| Trs_IssToProd_SourceStageDtl; Trs_JobOrder_PanelStock; Trs_JobWrkInv; Trs_JobWrkMas | issue-to-prod source stages; job-work stock/invoice | 3/8/11/8 |
| Trs_LaterPoEntry / _Dtl; Trs_LineTargetProdn; Trs_NewInvConDtl / CtnCondTls / CtnDtls / Trs_NewInvDtl | later PO entry, line targets, invoice carton details | 1 |
| Trs_Opening | opening stock/balance rows | 14 |
| Trs_OrderAllotment; Trs_PackingList_Mas; Trs_Pcs2_Acc / _Panel; Trs_PcsAdj1 / 2 | allotment, packing list, pcs variants/adjustments | 1/1/1/2/2/1 |
| Trs_PcsGodAck1 / 2; Trs_PcsGrn3_MistakePcs; Trs_PcsOpening; Trs_PcsStkAdjustmentDtl; Trs_PcsStockTfr1 | godown ack (2.TransId -> Trs_Pcs1.Id) + pcs extras | 3/8/2/4/2/4 |
| Trs_Prd_Stage_BypassSetting; Trs_ProdBill / ProdBllDetNew / ProdBillEntry / ProdBillMasNew | stage bypass; production bill set | 1/1/11/13/6 |
| Trs_ProdOpr_Breakup; Trs_ProdReserve; Trs_Production_Consolidate; Trs_ProdShiftStyle_Contribute; Trs_ProdShiftWages | production work tables | 1/1/1/1/6 |
| Trs_RejGodTran2; Trs_SewingBrkDown1; Trs_ShortageBits; Trs_ShortagePcs; Trs_YarnCons; Trs_Po3 | rejection/shortage/consumption; PO third table | 2/1/1/2/1/2 |
| Trs_PanelExcess / _Stage; Trs_PanelRej; Trs_PanelRework2 | panel excess/rejection/rework | 1/1/6/2 |
| Wages_ProductionDet / Wages_ProductionMas; WF_OperationMaster; WF_UserMas; WF_Workflow_Document; WF_Workflow_Planning | wages set; workflow framework | 7/22/3/1/1/10 |

Report staging tables (DDL on disk in host proc; truncated/refilled per run): Temp_BudgetAndActual (46), Temp_BudgetAndActual_Det (68), Temp_BudgetAndActualStyle (17), Temp_BudgetAndActualAbs (4) - SP_BudAndActual*; Tmp_OCRSummary (14), Tmp_OCRSummary_Pcs (16), Tmp_OCR_AccSummary (40) - Proc_Rpt_OCR_Summary*; Tmp_trg (7) - Vue_* staging; TempIOHisLedger (6), TempIOHisLedger_Others (2) - stock ledger; Temp_StkReports (2), Temp_PceReg (2), Temp_CutPanel_Rpt (2), TempAccStock (1), TempPartyBalAbs_All (1), Temp_DomesticPL (1), TmpOrderDet (5), TmpFabPro (8), TmpProg (8), TmpUom (7), Tmp_Cutting_Job/_Dtl (3/9), Tmp_HourlyProduction (1), Tmp_Shipment_Det1/2, DT_StkRptGrp (1), DT_Temp (3), BI_AccStock (20), BI_GrpStockInfo (4), BI_PceReg (14), BI_StkReports (33), MR_Fabric (11), MR_ProcessDetails (8), MR_Production (14), MR_Style (9).

Database views (the SPViews .sql files ARE the definitions; cols seen): Vue_TrsDc (24), Vue_TrsRec (17), Vue_StockAbs (2), VUE_RPT_AccStockItemLedgerAbs (19), Vue_Dailyinoutbalance (3), Vue_Dailyinoutordbalance (5), Vue_OrdExcessQtyWitStyle (2) / _WithoutClr (6) / _ClrNew (6), VUE_RPT_OrdExcessQty (1) / _Fabric (3) / _WithSaleRate (2), VUE_RPT_OrdQtyWithSaleRate (1), VUE_RPT_OrderColor (4), VUE_RPT_BudAbs (4) / _StyleWise (3), VUE_RPT_Budget_Abstract_StyleWise (2), Vue_St_ProgBalance_YarnDet/_FabricDet (3 each), Vue_AccRetAck (2), Vue_BillGrn (2), Vue_WBSList (5), VueDespatchStock1/2/3 (7/2/5); register views Vue_StkLedger, VUE_STOCKDTDATE, VUE_DEL_PRSRT, Vue_GrnRegFab*, Vue_InputGST, Vue_PcsStockDtl_PART, Vue_YarnProgBalDetail*, vue_ContractLedger_New_Balcheck, Vue_LabTestGarments.

## 4. Cross-table key map (joins actually used)

- OrdId int -> OrderMas.OrdId (universal). OrdId + StyleNo varchar(20) = order-style natural key on order/program/stock tables.
- StyleId -> Mas_StyleDesc.StyleId (global style key). StyleNo is order-scoped text; SP_StyleChange rewrites it across 30+ tables and logs to Trs_StyleChangeLog.
- LotId (LotSno) -> Mas_Lot.LotSno; LotNo varchar = Mas_Lot.LotName, joined BY NAME on order tables (OrderQtyDtl.LotNo = Mas_Lot.LotName), while Pcs_StockTable.LotID uses the int key.
- StageId / TargetStageId / SourceStageId -> Mas_JobWrkComp.Id (STAGE master); Mas_JobWrkComp.DeptId -> Mas_Dept.DeptID (DEPARTMENT master). Verified: Trs_ProdEntry.StageId = Mas_JobWrkComp.Id; Mas_JobWrkComp.DeptId = Mas_Dept.DeptId; Trs_BillRate.Dept = Mas_JobWrkComp.Id; Trs_Grn1.Dept = Mas_Dept.DeptID. "Dept" columns are overloaded - check per table.
- PartId -> Mas_Part.PartId. CompId -> Mas_Component.CompId (panel/component). WrkId -> Mas_JobWrkComp.Id (stage work / rate lookup).
- ColId (ClrId/ColorId) -> Mas_Color.ColId; CmbClrId = combo color; DyeColId = dyed color. SizeId (SizId) -> Mas_Size.SizeId. DiaId/FinDiaId/FindiaId -> Mas_Dia.DiaId. CntId (CountId) -> Mas_Count.CountId. FabId -> Mas_Fabric.FabId. DesignId -> Mas_Design.DesignId. MillId -> Mas_Mill.MillId. Print_DesignId -> Print_Design/Mas_Design domain.
- PartyId (Party/Pid) -> Mas_Party.Pid; SuppId and ContractorId also -> Mas_Party.Pid. EmpId -> Mas_Emp.Id. SrcLineID on pcs lines = issuing line owner (matches Pcs_StockTable.EmpID domain).
- GodId -> Mas_Godown.GodId; BuyerId -> Mas_Buyer.BuyerId; BuyerDeptId -> Mas_BuyerDept.Id; ExpId -> Mas_Exporter.ExpId; MerchId, SeasId, HSNId -> Mas_HSN.Id; StateId -> Mas_State.Id; UOMId/RateUOMId -> Mas_UOM.UOMId; RejectionTypeId -> Mas_RejectionType.RejectionTypeId.
- StockId -> StockTable.StockId: yarn/fab/acc item dimension (composite: CntId+ColId+FabId+DesignId+DiaId+FinDiaId+LL+Gsm+GG+MillId+ATYPE+ADES+Siz). Carried by Trs_Grn2, Trs_Del2/3/4, Trs_ReadyToCut2, Trs_BillRate, Trs_Deb2/4, CurrentStock, StockRatePost, Prog_Cns, Mas_Dept.StockId.
- PcsStockId -> Pcs_StockTable.PcsStockId -> Pcs_StockTableQty (key: PcsStockId + ColId + SizeId + IsNull(GoodPcsFlag,'G') + IsNull(RejectionTypeId,0)); Panel_StockTableQty adds CompId.
- Header->line: Trs_X1.Id = Trs_X2.Id for Po1/2, Grn1/2, MultiPrs_Grn1/2/3, Del1/2 (+3 spec +4 GST), ReadyToCut1/2 (+Ret), Pcs1/2, PcsGrn1/2 (+3), Deb1/2 (+3/4), Bills/BillRate, CutProdMas/Bundle. Newer TransId form: Trs_UnitAck2.TransId -> Trs_UnitAck1.Id; Trs_PcsGodAck2.TransId -> Trs_Pcs1.Id. Trs_ProdEntry.Id = Trs_ProdEntryQty.Id (+SizId per size).
- OrdJobNo varchar = composite order+style key on pcs-flow headers (Trs_Pcs1, Trs_PcsGrn1, Trs_LineInput, Trs_LineTfr).
- TranId/TranOrdId/TranStyleNo = transfer cross-reference on Trs_Del2 and Trs_ReadyToCut2 (receiving unit's document). Invid = invoice reference. Poid -> Trs_Po1.Id. DCId/OurDcId -> Trs_Del1.Id. OurDcRef/PartyDCRef = document-number cross refs (varchar).
- SeqNo -> Prod_Sequence (OrdId+StyleNo+StageId) defines flow order; copied to Pcs_StockTable.SeqNo, WBS_*.SeqNo. OrdSeq(OrdId, Sl, Prs) is the older order/process map.
- Barcode chain: Pay_CuttProdMas.Id = BundleMasID; Pay_CuttProd_Bundle.BundleId = BundleID; PcsBarcode varchar(30) links Pay_BarcodeGeneration -> Pay_BundlePcs_Barcode -> Pay_Pcs_ProdEntry.Barcode; Trs_ProdEntryQty also carries BundleMasId+BundleId.
- CoyCode int (CoyId on Trs_ProdEntry/AddPanel/PcsRej) = company/tenant on every header + stock aggregate; ToCoyCode = destination company on unit transfers. DocNo + FinYear = document numbering; FinanceYear master exists.
- Mas_AccDes pair ATYPE (AccTypeID) + ADES (Id) recur on StockTable, Trs_Po5, Trs_Shortage, Trs_BillRate, Pro_AccReq, ST_Acc_Prog_Balance (Atype/Ades/Asize/Acol). AddDed codes -> Mas_AddDed.AddDedCode on Trs_BillAddDed/Trs_JwrkInvAddDed.
- Trigger-owned aggregates (never hand-maintain): TRG_YARN_BALANCE_*/TRG_FAB_BALANCE_* -> ST_ProgBalance_*; Trg_ST_* -> ST_*; Trg_WBS_* -> WBS_*; Tgr_StockRatePost -> StockRatePost.CumBillRate; Trg_*_Update -> UpdateFlg flags.

## 5. Known unknowns

- No CREATE TABLE DDL on disk for persistent tables (only temp staging DDL + a commented CREATE TABLE Trs_StyleChangeLog in SP_StyleChange). Nullability, defaults, indexes: unknown. All types inferred.
- CurrentStock is owned by app-side proc Sp_currentstock (NOT in corpus; only Trg_CurrentStock_Update and Sp_currentstock_RollDtl are on disk). Treat CurrentStock (Kg/Mt/Bg per StockId+OrdId+StyleNo+GodId) as externally maintained; rebuild semantics and Bg meaning unknown.
- Options/Options1: only 4 named columns referenced; full config list invisible. Same for Mas_SizeGroup, Mas_User, GovtHolidays (name column), FinanceYear, Trs_JobWrkMas, Trs_DebAddDed, Prog_Clrloss (referenced, columns unseen).
- Mas_HSN BPerCH/BPerCL/NBPerCH/NBPerCL: GST % variants used to split tax in invoices vs DCs; exact per-column meaning (billable/non-billable x slab/local ?) unverified.
- PcsStockId assigned app-side via Select Max(IsNull(PcsStockId,0))+1 (PROC_GodownAck_Insert) - NOT an IDENTITY. Same pattern likely for StockId.
- Pcs_StockTable.EmpID <> 0 = line-held stock (doubles as SrcLineID); warehouse rows have EmpID 0/null. PartyId on stock headers is 0 for normal stock (non-zero = rework/other holding, meaning ?).
- GoodPcsFlag: 'G' = good stock; 'M' = mixed (set when ProcessType <> 'P' in PROC_GodownAck_Insert); other values possible but unseen.
- Trs_ContractorAllotment_Mas/_Det: only 2 references; full column sets unknown. Plain "Trs_ContractorAllotment" does not exist verbatim.
- Single-reference columns never defined elsewhere: Trs_Del2.TotBudAmt/TotRecKgs, Pay_Bundle_ProdEntry.* (only PostingFlg), Mas_Acc.Divide_Factor/Multiple_Factor/Nodec, Pro_ReqKnitt.ConsId, OrderMas.Ord/CostName, Trs_Del1.PrdId, Trs_ProdEntry.Brid/CuttingId, WBS_Production.BgColor, ST_Acc_PartyBal_Abs.Acc_Id, PcsStockRatePost.Id/DeptSlno.
- Supp* mirrors (SuppPcs_StockTable*, ST_Supp_*, WBS_Supp_*, Trs_SuppProdEntry*, SuppOrd*) maintained by Supp_* procs only partially present; posting rules assumed parallel to own-unit procs.
- Legacy comma-join style means a few low-frequency "columns" on wide tables may be master columns bleeding in (flagged ?). Trs_PcsGrn4 in queries is an alias over Trs_PcsGrn4_PackingDcDet. "Trs_ReadyToCutRet" is actually Trs_ReadyToCut_Ret1/_Ret2.
- Extraction excluded (noise): inserted/deleted pseudo-tables, sysobjects/syscolumns/systypes, cursor and CTE names (a, b, t, tt, cte, dpl, meeting). Trs_Po3 (Id + 1 col) role unconfirmed.
