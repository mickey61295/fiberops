# R09 - Masters (all /masters/* CRUD entities, party/style/fabric/yarn/knitting/garment/jobwork/dept/accessory/org/finance/people/statutory/misc, validations, pickers, master sync)

Level-2 module requirements. Source docs: 06-SCREEN-MAP.md (sec C, sec O), 02-COMPONENT-TREE.md (sec 18, sec 21, sec 22), 07-REPORTS-FLAGS.md (Part 2), 04-API-SERVICES.md (sec 14, masters endpoints), 03-DOMAIN-POSTING-ENGINE.md (sec 4.2), 01-HLR.md (HLR-25), R01-platform-foundation.md (MasterCrud pattern supplied by the platform).

## 1. Purpose & business context

Every loop in the legacy ERP resolves identities against masters: a DC names a Mas_Party job-worker, a GRN lands a shade from FrmShadeEntry into a fabric from FrmMasFabric, a production scan validates a stage from Mas_JobWrkComp whose PcsType decides which ledger the pieces hit, and cumulative rate walks departments in dept OrderSno order. The legacy app carries ~40 master CRUD screens (06 sec C plus two masters rows in sec O) with per-form duplicate and referential validations and their own messages. This module delivers all of them for the Next.js rewrite with 1:1 parity: same entities, same fields, same validation messages, same UpdateFlg sync behavior, and the same picker/search feel, all built on the single MasterCrud pattern the platform supplies (R01 PLT-035). Masters are module 17 in 01-HLR sec 3 (P0, stage S1): nothing else can be keyed until they load, so they are first in the build order.

## 2. Scope

In scope (06 sec C rows + sec O masters rows):
- Party (FrmPartyMaster), buyer + buyer dept (FRMBUYER, FrmMasBuyerDept).
- Style set (FrmStyleMaster, FrmStyleDesc, frmComposition), order group (frmOrderGroup).
- Fabric family (FrmMasFabric, frmFabricmaster, frmFomGrp, FrmMasTemplate), color set (frmGrammage, FrmShadeEntry).
- Yarn set (FrmCountGroup, FrmMill, frmThreadTypeMaster).
- Knitting set (frmDiaSize, frmDesignEntry, FrmMachineMaster, FrmMachineCategory, frmPrintDesign from 06 sec O).
- Garment set (Mas_Part, Mas_Size, frmSizeGroup, FrmRange, FrmRangeGrp, FrmRange_Orderwise).
- Jobwork set (stage master Mas_JobWrkComp screens incl. Frm_Formas, PcsType/Spl_Operation; Frm_SubProcess, FrmStageWiseTagMaster).
- Dept set (FrmDeptMasterNew, frmDeptGroup, frmDeptSettings incl. InputType/OutputType, SemiFinish, ProgFrm_Issue, RecMethod, OrderSno).
- Accessory set (FrmAccmaster, FrmAccCat, FrmAccDescMaster incl. Multiple_Factor/Divide_Factor, NoDec).
- Org set (FrmConcern, FrmGodownMaster/FrmGoDownSel, unit, season, merchandiser FrmMasMerchandiser).
- Finance set (FrmMasBank, FrmBankMaster, FrmMasBankAccount, frmFcymaster, frmFCRmaster, Mas_UOM + Mas_RateUom link).
- People set (FrmEmpmaster, FrmMasWorkNature).
- Statutory set (FrmStateMaster, FrmHSN, FrmHSNPce, Frm_Mas_Holiday, frmTerms, frmPaytem, FrmDeliveryAtMas from 06 sec O).
- Misc set (frmGenrec, FrmFormDef, Frm_Master generic).
- Lot master maintenance rows behind FrmLotRegister (pattern only; life-cycle owned by R03).
- Cross-cutting: shared MasterCrud wiring, duplicate/in-use validations, typed picker feeds, rights gating, UpdateFlg sync, MasterAlias for the AI harness.

Out of scope (owned elsewhere; boundary rows in sec 10):
- Rate masters (FrmRateMaster, FrmPrdnRateMaster, FrmCommRateMaster, frmDefaultRate) - R03 PRC-016 (/purchase/rates/*).
- Expense masters (FrmMasExpenses, FrmExpenseGroup, FrmExpenses, FrmFixedExpensesEntry) - R07 CST-018/CST-019 (/costing/expenses).
- Pre-costing component master (FrmPreCostingCompMas) - R07 (/planning/budget/pre, precostingflg).
- Lot register/life-cycle (FrmLotRegister views) - R03 GRN-019; HSN commercial screen (/commercial/hsn) - R06 BIL-015 (shared tables).

## 3. Functional requirements

| FR ID | Requirement | Source (form/proc/flag) | Priority | Stage |
|---|---|---|---|---|
| MAS-001 | All master screens shall reuse one <MasterCrud> pattern (list + form + history/UpdateFlg tab) with entity forms composed from the shared UI kit (react-hook-form wiring per screen class). | 02 sec 18, sec 22; 06 sec C | P0 | S1 |
| MAS-002 | The system shall expose one generic master API set /api/masters/:entity (list, create, update, deactivate) backed by a single MastersService with one zod schema per entity and thin route handlers. | 04 sec 14; 01 sec 2 | P0 | S1 |
| MAS-003 | Every master save shall enforce the legacy duplicate and referential validations of the ported form (duplicate name/code checks, in-use delete block) keeping user-visible legacy message strings verbatim. | HLR-25; 06 sec C | P0 | S1 |
| MAS-004 | Every master save/update shall set UpdateFlg=1 in the same transaction so the Commando sync layer (server_id protocol, GET /api/sync/pull) picks up changed masters. | 02 sec 18; 04 sec 11 | P0 | S1 |
| MAS-005 | The party master (FrmPartyMaster -> /masters/party) shall maintain Mas_Party rows for job-workers and suppliers with GST state via StatePicker, address/TIN/TDS fields, and UpdateFlg sync. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-006 | Party classification shall honor flags personprocess, firmprocess, and allservice so accessory-flow party types (person/firm/service) behave identically to legacy at the same code points. | 07 sec 2.3 | P0 | S1 |
| MAS-007 | The buyer master (FRMBUYER -> /masters/buyer) shall maintain buyers exactly as the legacy form does, feeding buyer pickers and IO entry. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-008 | The buyer-dept master (FrmMasBuyerDept -> /masters/buyer) shall maintain buyer departments as maintained in legacy. | 06 sec C | P0 | S1 |
| MAS-009 | The style master (FrmStyleMaster -> /masters/style) shall maintain styles with the legacy field set, feeding StylePicker and order entry. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-010 | The style description and composition masters (FrmStyleDesc, frmComposition -> /masters/style) shall maintain style descriptions and fabric composition lines, with style images stored under the configured attachpath/imgpath via ImagePanel. | 06 sec C; 07 sec 2.3 | P0 | S1 |
| MAS-011 | The order-group master (frmOrderGroup) shall be maintained via the shared MasterCrud pattern under flag ordergroupingreqd; the /orders/ref screen family is owned by R02 (ORD-022). | 06 sec C; 07 sec 2.3; R02 | P1 | S2 |
| MAS-012 | The fabric master family (FrmMasFabric, frmFabricmaster, frmFomGrp, FrmMasTemplate -> /masters/fabric) shall maintain fabric identities, FOM groups, and fabric templates with UomPicker. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-013 | The fabric master shall carry a separate process UOM distinct from the base UOM only when different_processuom_reqd_in_fabmaster is set (UOM display parity in masters and planning). | 06 sec C; 07 sec 2.3 | P0 | S1 |
| MAS-014 | The grammage master (frmGrammage -> /masters/color) shall maintain GSM grammages used by fabric and order identity. | 06 sec C | P0 | S1 |
| MAS-015 | The shade master (FrmShadeEntry -> /masters/color) shall maintain shades used by dyeing lots, GRN fabric identity, and ShadePicker. | 06 sec C | P0 | S1 |
| MAS-016 | The yarn master set (FrmCountGroup, FrmMill, frmThreadTypeMaster -> /masters/yarn) shall maintain count groups, mills, and thread types feeding MillPicker/CountPicker; fabtoyarn_count_hide_in_requirement hides the fab-to-yarn count in requirements. | 06 sec C; 07 sec 2.3 | P0 | S1 |
| MAS-017 | The knitting master set (frmDiaSize, frmDesignEntry -> /masters/knitting) shall maintain dia sizes (dia/finish dia) and knitting designs. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-018 | The machine master set (FrmMachineMaster, FrmMachineCategory -> /masters/knitting) shall maintain machines and categories with history linked to the mobile breakdown report (/m/breakdown-report). | 06 sec C; 06 sec K; 02 sec 18 | P1 | S2 |
| MAS-019 | The print-design master (frmPrintDesign -> /masters/knitting, design print) shall maintain print designs per the 06 sec O masters row. | 06 sec O | P1 | S2 |
| MAS-020 | The garment master set (Mas_Part, Mas_Size, frmSizeGroup -> /masters/garment) shall maintain parts, sizes, and size groups used by cut plans and piece ledgers. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-021 | The range masters (FrmRange, FrmRangeGrp, FrmRange_Orderwise -> /masters/garment) shall maintain size ranges, range groups, and order-wise range ordering. | 06 sec C | P1 | S2 |
| MAS-022 | The job-work stage master (Mas_JobWrkComp screens -> /masters/jobwork) shall maintain stages with PcsType (Piece/Panel/Bit) driving the posting path (03 sec 4.2), the Spl_Operation toggle, and the stage-to-dept link. | 06 sec C; 02 sec 18; 03 sec 4.2 | P0 | S1 |
| MAS-023 | The stage-forms master (Frm_Formas -> /masters/jobwork) shall maintain job-work stage forms per legacy. | 06 sec C | P1 | S2 |
| MAS-024 | The sub-process and stage-tag masters (Frm_SubProcess, FrmStageWiseTagMaster -> /masters/jobwork) shall maintain sub-processes (SubPrsId split) and stage-wise tags. | 06 sec C | P1 | S2 |
| MAS-025 | The dept master set (FrmDeptMasterNew, frmDeptGroup, frmDeptSettings -> /masters/dept) shall maintain departments and groups carrying InputType/OutputType, SemiFinish, ProgFrm_Issue, and RecMethod settings. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-026 | Dept settings OrderSno shall fix the process-route order consumed by requirement explosion and the cumulative-rate chain (Sno order per HLR-19). | 06 sec C; 01-HLR HLR-19 | P0 | S1 |
| MAS-027 | The accessory master set (FrmAccmaster, FrmAccCat, FrmAccDescMaster -> /masters/accessories) shall maintain items, categories, and descriptions with Multiple_Factor/Divide_Factor conversion factors and NoDec precision inputs. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-028 | The concern master (FrmConcern -> /masters/org) shall maintain companies/concerns feeding the company login chain and coy scoping. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-029 | The godown masters (FrmGodownMaster, FrmGoDownSel -> /masters/org) shall maintain godowns; FrmGoDownSel also feeds the ctx godown selector used by document entry. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-030 | The org masters unit, season, and merchandiser (FrmMasMerchandiser -> /masters/org) shall maintain production units, seasons, and merchandisers per legacy. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-031 | The bank masters (FrmMasBank, FrmBankMaster, FrmMasBankAccount -> /masters/finance) shall maintain banks and accounts consumed by invoice bank print. | 06 sec C | P1 | S2 |
| MAS-032 | The currency masters (frmFcymaster, frmFCRmaster -> /masters/finance) shall maintain currencies and forward-contract rates via RateTable, feeding FCY sale-rate valuation (forward-else-spot). | 06 sec C; 01-HLR HLR-06 | P0 | S2 |
| MAS-033 | The UOM master (Mas_UOM -> /masters/finance) shall maintain units of measure including the Mas_RateUom link used for rate UOMs across POs, bills, and rates. | 06 sec C; HLR-25 | P0 | S1 |
| MAS-034 | The employee master (FrmEmpmaster -> /masters/people) shall maintain employees as operator/line/contractor identities with LineLink. | 06 sec C; 02 sec 18 | P0 | S1 |
| MAS-035 | The work-nature master (FrmMasWorkNature -> /masters/people) shall maintain work natures; when natureofwrk_tamil is set the work nature prints in Tamil. | 06 sec C; 07 sec 2.3 | P1 | S1 |
| MAS-036 | The state master (FrmStateMaster -> /masters/statutory) shall maintain states used for party GST state and intra/inter (CGST+SGST vs IGST) determination. | 06 sec C; R06 BR-06 | P0 | S1 |
| MAS-037 | The HSN masters (FrmHSN, FrmHSNPce -> /masters/statutory) shall maintain HSN codes and piece HSN with SlabEditor for NBPercL/H and BPercL/H slabs (shared tables with R06 BIL-015 /commercial/hsn). | 06 sec C; 02 sec 13, sec 18 | P0 | S1 |
| MAS-038 | The holiday master (Frm_Mas_Holiday -> /masters/statutory) shall maintain government holidays with CalendarInput, feeding WF_PlanFinishDateArrival date math (HLR-23). | 06 sec C; 04 sec 3 | P0 | S1 |
| MAS-039 | The terms masters (frmTerms, frmPaytem -> /masters/statutory) shall maintain invoice terms and payment terms per legacy. | 06 sec C | P1 | S2 |
| MAS-040 | The deliver-to master (FrmDeliveryAtMas -> /masters/statutory) shall maintain DeliveryAt locations used as DelAt on invoices (06 sec O masters row). | 06 sec O | P1 | S2 |
| MAS-041 | The misc masters (frmGenrec, FrmFormDef, Frm_Master -> /masters/misc) shall maintain generic records, form defines, and the generic master table. | 06 sec C | P1 | S2 |
| MAS-042 | Lot master maintenance rows behind FrmLotRegister (/grn/lots) shall follow the shared MasterCrud pattern with lot-no duplicate checks per lot_seq/nlot policy; the lot register and life-cycle are owned by R03 (GRN-019, LotService). | 06 sec C; 07 sec 2.2; R03 | P0 | S2 |
| MAS-043 | Master lists shall feed the typed picker library (OrderPicker, PartyPicker, ShadePicker, MillPicker, CountPicker, GodownPicker, AccPicker, UomPicker) with server-side search parity to legacy popups (PLT-031). | 02 sec 21 | P0 | S1 |
| MAS-044 | The StagePicker shall be served from the stage master via the Prod_Sequence route order so stage pickers list stages in production order. | 02 sec 21; 03 sec 4.2 | P0 | S1 |
| MAS-045 | All master routes shall enforce rights server-side keyed module.screen.action (new/edit/deactivate/print buttons), the client <Can do> guard being cosmetic only. | 01 sec 3.2 (PLT-010); NFR-09 | P0 | S1 |
| MAS-046 | Master list grids shall reach DataTable FlexGrid parity (sort, search, footer) and export to Excel/CSV via ExportBar (Interop.Excel parity). | 02 sec 21; 07 sec 1.2 | P1 | S2 |
| MAS-047 | The party master shall capture mobile/mail contact fields consumed by NotificationService triggers only when mobileno/mail flags are set. | 07 sec 2.3 | P1 | S2 |
| MAS-048 | Master screens and pickers shall honor the UI behavior toggles btnmenu and popup_default_selection (menu button layout and popup default selection) at the same legacy code points. | 07 sec 2.3 | P1 | S1 |
| MAS-049 | Every master row change shall be auditable via the MasterCrud history tab (who/when/what) alongside the UpdateFlg sync state. | 02 sec 18 | P1 | S1 |
| MAS-050 | The system shall maintain the additive MasterAlias table mapping AI-parsed names (supplier bills, buyer POs, challans) to master IDs for the AI review-confirm loop; no legacy table is altered. | 01-HLR sec 6 constraints; 09 AI | P1 | S8 |

FR count: MAS 50 (P0: 34, P1: 16).

## 4. Business rules & validations

- BR-01: One MasterCrud pattern serves every entity (list + form + history/UpdateFlg); entity forms differ only in fields and extra components (StatePicker, UomPicker, FactorInputs, SlabEditor, CalendarInput, RateTable, LineLink, ImagePanel, PcsTypePicker, SplOperationToggle, InputOutputTypePicker).
- BR-02: Duplicate name/code validation runs on save per the legacy form; any message the legacy user saw stays byte-identical (PLT-020 error contract).
- BR-03: A master row referenced by transactions (party on DCs, fabric on GRNs, stage on production, dept on rates, HSN on bills, godown on stock) cannot be deleted; deactivation hides it from new pickers while history keeps resolving it.
- BR-04: Master saves set UpdateFlg=1 inside the same transaction; sync pull/ack (R01 INT-008) clears it. No partial sync state survives a failed save.
- BR-05: Party classification honors personprocess/firmprocess/allservice verbatim for accessory-flow party typing (AccService parity).
- BR-06: A separate process UOM on the fabric master exists only under different_processuom_reqd_in_fabmaster; planning and requirement displays read it from the same master field.
- BR-07: Stage master PcsType (Piece/Panel/Bit) is the single source for which ledger a production entry hits (03 sec 4.2); Spl_Operation marks special-operation stages.
- BR-08: Dept settings OrderSno fixes process-route order for requirement explosion and cumulative-rate Sno walking; InputType/OutputType, SemiFinish, ProgFrm_Issue, and RecMethod are honored at their legacy code points.
- BR-09: Accessory Multiple_Factor/Divide_Factor conversions and NoDec decimal precision are enforced wherever accessory quantities are computed.
- BR-10: HSN slabs NBPercL/H and BPercL/H (FrmHSNPce) drive piece-invoice percents; state master on party decides CGST+SGST vs IGST; gstenable gates the fields (shared rule with R06).
- BR-11: The holiday master feeds WF_PlanFinishDateArrival so WBS date math skips weekly-offs and government holidays (HLR-23).
- BR-12: Style images and master attachments are stored under the configured imgpath/attachpath flags, never hard-coded paths.
- BR-13: natureofwrk_tamil switches work-nature output to Tamil on wage/work prints fed by the work-nature master.
- BR-14: Rights are enforced server-side on every master route; client hiding is cosmetic (NFR-09).
- BR-15: MasterAlias is additive only; no legacy master table is altered or dropped (NFR-13), and AI drafts never write masters directly - a confirmed alias mapping does.

## 5. Data & postings

Tables touched (read/write):
- Party/buyer: Mas_Party, buyer + buyer dept tables (FRMBUYER/FrmMasBuyerDept parity).
- Style: style master set (FrmStyleMaster/FrmStyleDesc/frmComposition tables) with attachments under attachpath/imgpath.
- Fabric/color/yarn: Mas_Fabric family (incl. FomGrp, template, process-UOM fields), grammage, shade; count group, mill, thread type tables.
- Knitting/garment: dia size, design, machine + machine category, print design; Mas_Part, Mas_Size, size group, range/range-group/order-wise range tables.
- Jobwork/dept: Mas_JobWrkComp (PcsType, Spl_Operation, dept link), Formas, sub-process (SubPrsId), stage-wise tag master; DeptMasterNew/DeptGroup/deptSettings (InputType/OutputType, SemiFinish, ProgFrm_Issue, RecMethod, OrderSno).
- Accessories/org/finance: Accmaster/AccCat/AccDesc (Multiple_Factor, Divide_Factor, NoDec); Concern, godown, unit, season, merchandiser; bank/bank-account, Fcy/FCR rates, Mas_UOM/Mas_RateUom.
- People/statutory/misc: Empmaster, Mas_WorkNature; state, HSN/HSNPce slabs, holiday, terms, paytem, DeliveryAtMas; Genrec/FormDef/generic master tables.
- Additive: MasterAlias (AI name -> master ID mapping).

Posting matrix rows from 03 that apply: none - masters own no movements. Masters are the identity source every posting path resolves against (party, fabric/shade, stage PcsType, dept route, godown), and the stage master's PcsType is what routes production rows to Piece/Panel/Assembly ledgers (03 sec 4.2).

Projector events: SyncFlagProjector semantics ride on every master save (UpdateFlg=1 dirty flags for Commando sync per BR-04).

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| /masters/party | MasterCrud, StatePicker | FrmPartyMaster |
| /masters/buyer | MasterCrud | FRMBUYER, FrmMasBuyerDept |
| /masters/style | MasterCrud, ImagePanel | FrmStyleMaster, FrmStyleDesc, frmComposition |
| /orders/ref (group form) | MasterCrud | frmOrderGroup (screen family owned by R02) |
| /masters/fabric | MasterCrud, UomPicker | FrmMasFabric, frmFabricmaster, frmFomGrp, FrmMasTemplate |
| /masters/color | MasterCrud | frmGrammage, FrmShadeEntry |
| /masters/yarn | MasterCrud | FrmCountGroup, FrmMill, frmThreadTypeMaster |
| /masters/knitting | MasterCrud | frmDiaSize, frmDesignEntry, FrmMachineMaster, FrmMachineCategory, frmPrintDesign |
| /masters/garment | MasterCrud | Mas_Part, Mas_Size, frmSizeGroup, FrmRange, FrmRangeGrp, FrmRange_Orderwise |
| /masters/jobwork | MasterCrud, PcsTypePicker, SplOperationToggle | Mas_JobWrkComp stage screens, Frm_Formas, Frm_SubProcess, FrmStageWiseTagMaster |
| /masters/dept | MasterCrud, InputOutputTypePicker | FrmDeptMasterNew, frmDeptGroup, frmDeptSettings |
| /masters/accessories | MasterCrud, FactorInputs | FrmAccmaster, FrmAccCat, FrmAccDescMaster |
| /masters/org | MasterCrud | FrmConcern, FrmGodownMaster, FrmGoDownSel, unit, season, FrmMasMerchandiser |
| /masters/finance | MasterCrud, RateTable, UomPicker | FrmMasBank, FrmBankMaster, FrmMasBankAccount, frmFcymaster, frmFCRmaster, Mas_UOM |
| /masters/people | MasterCrud, LineLink | FrmEmpmaster, FrmMasWorkNature |
| /masters/statutory | MasterCrud, SlabEditor, CalendarInput | FrmStateMaster, FrmHSN, FrmHSNPce, Frm_Mas_Holiday, frmTerms, frmPaytem, FrmDeliveryAtMas |
| /masters/misc | MasterCrud | frmGenrec, FrmFormDef, Frm_Master |
| /grn/lots (master rows) | MasterCrud (pattern only) | frmLot masters via FrmLotRegister (life-cycle R03) |

## 7. API endpoints (from 04)

| Method + path | Service | Notes |
|---|---|---|
| GET /api/masters/:entity?search=&active= | MastersService.list() | feeds registers and typed pickers |
| POST /api/masters/:entity | MastersService.create() | duplicate + in-use validation, legacy messages verbatim |
| PATCH /api/masters/:entity/:id | MastersService.update() | sets UpdateFlg=1 for sync |
| POST /api/masters/:entity/:id/deactivate | MastersService.deactivate() | in-use block per BR-03 |
| GET /api/masters/:entity/:id/history | MastersService.history() | MasterCrud history tab |
| POST /api/masters/rate/prdn-rate/comm-rate/default-rate | RateMasterService.* | owned by R03 (PRC-016); shown here only for the /api/masters/* namespace boundary |

## 8. Reports & prints (from 07 sec 1)

- Masters own no dedicated legacy report family in 07 Part 1; master data feeds every report filter and picker (party, order, style, shade, godown, stage).
- Master list grids export to Excel/CSV via ExportBar (Interop.Excel parity).
- natureofwrk_tamil changes work-nature printing on wage/work prints (PrintLayout owned by R05/R06; the master supplies the Tamil text).
- Bank-account master feeds invoice bank print; FCR rates feed FCY valuation prints (R06).
- Machine-master history feeds the mobile breakdown report (/m/breakdown-report, R06 QC-006).

## 9. Flags affecting this module (verbatim legacy names)

| Flag | Effect |
|---|---|
| personprocess / firmprocess / allservice | accessory-flow party classification honored on the party master (AccService behavior at the same legacy code points) |
| different_processuom_reqd_in_fabmaster | fabric master carries a separate process UOM vs base UOM (masters/planning UOM displays) |
| fabtoyarn_count_hide_in_requirement | hides the fab-to-yarn count in requirement displays fed by the yarn masters |
| partsinuom | part UOM displays fed by the UOM master (masters/planning) |
| natureofwrk_tamil | work-nature master output prints in Tamil on wage/work prints |
| mobileno / mail | party contact fields consumed by NotificationService mail/SMS triggers only when set |
| btnmenu / popup_default_selection / allgpayempreqd | UI behavior toggles honored on master screens and pickers (shell/masters) |
| ordergroupingreqd | enables order-group master usage (screen family owned by R02) |
| lot_seq / nlot | lot master numbering policy (life-cycle owned by R03 LotService) |
| imgpath / attachpath | style images and master attachment storage paths |
| gstenable | gates GST fields driven by state/HSN masters (shared with R06) |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form (06) | FR IDs |
|---|---|
| FrmPartyMaster | MAS-005, MAS-006, MAS-047 |
| FRMBUYER | MAS-007 |
| FrmMasBuyerDept | MAS-008 |
| FrmStyleMaster | MAS-009 |
| FrmStyleDesc | MAS-010 |
| frmComposition | MAS-010 |
| frmOrderGroup | MAS-011 |
| FrmMasFabric | MAS-012, MAS-013 |
| frmFabricmaster | MAS-012, MAS-013 |
| frmFomGrp | MAS-012 |
| FrmMasTemplate | MAS-012 |
| frmGrammage | MAS-014 |
| FrmShadeEntry | MAS-015 |
| FrmCountGroup | MAS-016 |
| FrmMill | MAS-016 |
| frmThreadTypeMaster | MAS-016 |
| frmDiaSize | MAS-017 |
| frmDesignEntry | MAS-017 |
| FrmMachineMaster | MAS-018 |
| FrmMachineCategory | MAS-018 |
| Mas_Part | MAS-020 |
| Mas_Size | MAS-020 |
| frmSizeGroup | MAS-020 |
| FrmRange | MAS-021 |
| FrmRangeGrp | MAS-021 |
| FrmRange_Orderwise | MAS-021 |
| stage master (Mas_JobWrkComp screens) | MAS-022, MAS-044 |
| Frm_Formas | MAS-023 |
| Frm_SubProcess | MAS-024 |
| FrmStageWiseTagMaster | MAS-024 |
| FrmDeptMasterNew | MAS-025 |
| frmDeptGroup | MAS-025 |
| frmDeptSettings | MAS-025, MAS-026 |
| FrmAccmaster | MAS-027 |
| FrmAccCat | MAS-027 |
| FrmAccDescMaster | MAS-027 |
| FrmConcern | MAS-028 |
| FrmGodownMaster / FrmGoDownSel | MAS-029 |
| season / merchandiser (FrmMasMerchandiser) | MAS-030 |
| FrmMasBank / FrmBankMaster / FrmMasBankAccount | MAS-031 |
| frmFcymaster / frmFCRmaster | MAS-032 |
| Mas_UOM / UOM picker | MAS-033 |
| FrmEmpmaster | MAS-034 |
| FrmMasWorkNature | MAS-035 |
| FrmStateMaster | MAS-036 |
| FrmHSN / FrmHSNPce | MAS-037 |
| Frm_Mas_Holiday | MAS-038 |
| frmTerms / frmPaytem | MAS-039 |
| frmGenrec / FrmFormDef / Frm_Master | MAS-041 |
| frmLot masters (via FrmLotRegister) | MAS-042 (register/life-cycle R03 GRN-019) |
| FrmDeliveryAtMas (06 sec O) | MAS-040 |
| frmPrintDesign (06 sec O) | MAS-019 |
| FrmMasExpenses / FrmExpenseGroup / FrmExpenses / FrmFixedExpensesEntry | not R09 - expense masters owned by R07 (CST-018, CST-019); MasterCrud pattern supplied here |
| FrmPreCostingCompMas (06 sec O) | not R09 - pre-costing component master owned by R07 (/planning/budget/pre, precostingflg) |
| FrmRateMaster / FrmPrdnRateMaster / FrmCommRateMaster / frmDefaultRate (06 sec F) | not R09 - rate masters owned by R03 (PRC-016) |
| Frm_AppAwBill | not masters - approvals form (06 sec J; R08); explicitly excluded |
| frmOptions / FrmOptionsPrint | not R09 - per-order stock options (see R01 sec 10 boundary note) |

## 11. Open items / blockers

- OB-01: UpdateFlg sync pattern for masters triggers (Trg_Mas_*_Update parity): legacy master tables carry their own update triggers that stamp the sync dirty flag; the rewrite must set UpdateFlg=1 inside the same save transaction with identical trigger parity. The exact Trg_Mas_*_Update set per master table must be extracted from the live DB during S1 before MAS-004 is signed off.
- OB-02: The exact legacy duplicate/in-use message strings per master form are only partially captured in the source docs; each must be recorded verbatim before MAS-003 parity fixtures are frozen.
- OB-03: Policy for changing stage-master PcsType or dept OrderSno after transactions exist (re-route risk to ledgers and cumulative rate) needs business sign-off; legacy behavior must be confirmed before allowing edits.
- OB-04: Generic masters semantics (frmGenrec, FrmFormDef, Frm_Master) are thinly documented; the concrete table list and form-define behaviors must be listed from the legacy DB before MAS-041 is built.
- OB-05: The org "unit" master appears in 06 sec C without a named legacy form; the form/table identity must be confirmed (MAS-030).
- OB-06: HSN masters are shared with R06 (BIL-015 /commercial/hsn); confirm one write path (this module's statutory screens) with R06 reading, so slabs are maintained in exactly one place.
- OB-07: Party contact usage under mobileno/mail (which notifications fire to which party field) must be confirmed against legacy NotificationService behavior before MAS-047.
