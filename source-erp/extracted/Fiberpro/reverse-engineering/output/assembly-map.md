# FiberPro Reverse Engineering Map

Generated: 2026-03-15T10:35:19

## Priority Targets

| Priority | File | Role | Status | Types | Candidate Forms |
| --- | --- | --- | --- | ---: | ---: |
| 1 | Fiberpro.exe | Main ERP client | Managed | 525 | 321 |
| 2 | GReportConfig.dll | Reporting and dataset layer | Managed | 2432 | 0 |
| 3 | Fiberpro Library.dll | Shared business library | Managed | 14 | 0 |
| 4 | Fiberpro_ReportLibrary.dll | Reporting helper library | Managed | 13 | 0 |
| 5 | CustomFlexGrid.dll | Custom UI grid control | Managed | 14 | 0 |
| 6 | Fiberpro_Lib.dll | Native or COM helper | NativeOrUnsupported | 0 | 0 |

## Fiberpro.exe

- Role: Main ERP client
- Status: Managed
- Assembly: Fiberpro, Version=2.5.9.4, Culture=neutral, PublicKeyToken=null
- Company: Global Softwares
- Product: Joms
- Types recovered: 525
- Top-level types: 354
- Candidate forms: 321
- Top namespaces:
  - Fiberpro (516)
  - Fiberpro.My (8)
  - Fiberpro.My.Resources (1)
- Candidate forms:
  - Fiberpro.Frm_AppAwBill
  - Fiberpro.Frm_AppMas
  - Fiberpro.Frm_CommercialTemplate
  - Fiberpro.frm_composition
  - Fiberpro.Frm_CostingInput
  - Fiberpro.Frm_GoDownSel
  - Fiberpro.Frm_Lock
  - Fiberpro.Frm_Mas_Holiday
  - Fiberpro.Frm_Master
  - Fiberpro.Frm_OrderInputMas
  - Fiberpro.Frm_Ordersheet_Preview
  - Fiberpro.Frm_Password_List
  - Fiberpro.Frm_ProductionCost
  - Fiberpro.Frm_ProductionEntryReg
  - Fiberpro.Frm_ProductionWages
  - Fiberpro.Frm_ProdWagesDept
  - Fiberpro.Frm_ProdWagesStage
  - Fiberpro.Frm_ProRouteTemplate
  - Fiberpro.Frm_RollSplit
  - Fiberpro.Frm_SubProcess
  - Fiberpro.Frm_WF_DocumentStore
  - Fiberpro.FrmAcc_ProgCancel
  - Fiberpro.frmAccack
  - Fiberpro.FrmAccCat
  - Fiberpro.FrmAccDel
  - Fiberpro.FrmAccDel_Return
  - Fiberpro.FrmAccDescMaster
  - Fiberpro.FrmAccItemApproval
  - Fiberpro.FrmAccmaster
  - Fiberpro.frmAccSalesDel
  - Fiberpro.frmAccShort
  - Fiberpro.FrmAccStockReg
  - Fiberpro.frmAccStockShow
  - Fiberpro.frmAddPanelCutting
  - Fiberpro.FrmBankMaster
  - Fiberpro.frmBarcodeReadingNew
  - Fiberpro.frmBillPass
  - Fiberpro.FrmBillsAddDedReport
  - Fiberpro.FrmBillsReg
  - Fiberpro.frmBudcom
  - Fiberpro.frmBudget
  - Fiberpro.FrmBudgetAndActualComp
  - Fiberpro.frmBudgetNew_JobWork
  - Fiberpro.FrmBundle_ProductionEntry
  - Fiberpro.FRMBUYER
  - Fiberpro.frmBuyerPLReport
  - Fiberpro.FrmBuyerStatus
  - Fiberpro.FrmChangeGodown
  - Fiberpro.FrmChangePassword
  - Fiberpro.frmclose
- Referenced assemblies:
  - AxInterop.AcroPDFLib
  - AxInterop.MSFlexGridLib
  - CrystalDecisions.CrystalReports.Engine
  - CrystalDecisions.ReportSource
  - CrystalDecisions.Shared
  - CrystalDecisions.Windows.Forms
  - Fiberpro Library
  - Fiberpro_ReportLibrary
  - GReportConfig
  - Interop.Excel
  - Interop.Microsoft.Office.Core
  - Interop.MSFlexGridLib
  - MessagingToolkit.Barcode
  - Microsoft.VisualBasic
  - mscorlib
  - Newtonsoft.Json
  - Stimulsoft.Base
  - Stimulsoft.Report
  - System
  - System.Data
  - System.Drawing
  - System.Windows.Forms
  - zxing

## GReportConfig.dll

- Role: Reporting and dataset layer
- Status: Managed
- Assembly: GReportConfig, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
- Product: GReportConfig
- Types recovered: 2432
- Top-level types: 1705
- Candidate forms: 0
- Top namespaces:
  - GReportConfig (2212)
  - GReportConfig.My (7)
  - GReportConfig.StiReportDataSetTableAdapters (6)
  - GReportConfig.RptGRNRegFab_BuyerDataSetTableAdapters (4)
  - GReportConfig.Rpt_PieceDC_UnitTfrDataSetTableAdapters (4)
  - GReportConfig.RptGateBillEntry1DataSetTableAdapters (4)
  - GReportConfig.RptGateBillEntryDataSetTableAdapters (4)
  - GReportConfig.RptSupplierOrdReg_ClrDataSetTableAdapters (4)
  - GReportConfig.RptDirectBillPassRegDataSetTableAdapters (4)
  - GReportConfig.RptSalesPendingRegTableAdapters (4)
  - GReportConfig.RptSupplierOrder_inHand_DataSetTableAdapters (4)
  - GReportConfig.RptDirectBillsRegDataSetTableAdapters (4)
  - GReportConfig.RptBillsRegAbsDataSetTableAdapters (4)
  - GReportConfig.RptTallyPurAndExpexpdatasetTableAdapters (4)
  - GReportConfig.RptInHouseProdRegPerDataSetTableAdapters (4)
- Referenced assemblies:
  - CrystalDecisions.CrystalReports.Engine
  - CrystalDecisions.ReportSource
  - CrystalDecisions.Shared
  - Microsoft.VisualBasic
  - mscorlib
  - System
  - System.Data
  - System.Drawing
  - System.Xml

## Fiberpro Library.dll

- Role: Shared business library
- Status: Managed
- Assembly: Fiberpro Library, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
- Company: global
- Product: JOMS Library
- Types recovered: 14
- Top-level types: 12
- Candidate forms: 0
- Top namespaces:
  - Fiberpro_Library.My (7)
  - Fiberpro_Library (6)
  - Fiberpro_Library.My.Resources (1)
- Referenced assemblies:
  - AxInterop.MSFlexGridLib
  - Interop.Excel
  - Interop.Microsoft.Office.Core
  - Microsoft.VisualBasic
  - mscorlib
  - Newtonsoft.Json
  - System
  - System.Data
  - System.Drawing
  - System.Web
  - System.Windows.Forms

## Fiberpro_ReportLibrary.dll

- Role: Reporting helper library
- Status: Managed
- Assembly: Fiberpro_ReportLibrary, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
- Product: WindowsControlLibrary1
- Types recovered: 13
- Top-level types: 10
- Candidate forms: 0
- Top namespaces:
  - Fiberpro_ReportLibrary.My (8)
  - Fiberpro_ReportLibrary (4)
  - Fiberpro_ReportLibrary.My.Resources (1)
- Referenced assemblies:
  - AxInterop.MSFlexGridLib
  - Fiberpro Library
  - Microsoft.VisualBasic
  - mscorlib
  - System
  - System.Data
  - System.Windows.Forms

## CustomFlexGrid.dll

- Role: Custom UI grid control
- Status: Managed
- Assembly: CustomFlexGrid, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
- Company: Global Softwares
- Product: CustomFlexGrid
- Types recovered: 14
- Top-level types: 14
- Candidate forms: 0
- Top namespaces:
  - CustomFlexGrid.Collections (6)
  - CustomFlexGrid.Enumerators (4)
  - CustomFlexGrid (2)
  - CustomFlexGrid.Exceptions (2)
- Referenced assemblies:
  - AxInterop.MSFlexGridLib
  - mscorlib
  - System
  - System.Drawing

## Fiberpro_Lib.dll

- Role: Native or COM helper
- Status: NativeOrUnsupported
- Types recovered: 0
- Top-level types: 0
- Candidate forms: 0
- Loader exception sample:
  - Exception calling "GetAssemblyName" with "1" argument(s): "Could not load file or assembly 'Fiberpro_Lib.dll' or one of its dependencies. An attempt was made to load a program with an incorrect format."
