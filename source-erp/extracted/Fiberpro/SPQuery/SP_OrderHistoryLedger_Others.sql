 /*                  

;=============================================                  

; Author  :  Global Software's                  

; Create date  :  01/Nov/2019                  

; Create By  :  ASLAM                  

; Description  :  Stored Procedure for Posting the Production Details for commando cloud

; Change Person  :  ASLAM                

; Last Change Date :  08/Mar/2023 9.30 AM                  

; =============================================   */ 

CREATE PROCEDURE SP_OrderHistoryLedger_Others (@OrdID as int,@IPAddress nVarchar(25))AS BEGIN DECLARE @SQLSTR AS NVARCHAR(4000) SET @SQLSTR=N'SELECT   Mas_Exporter.ExporterName,ShortExp, TempIoHisLedger.PurType, OrderMas.OrdId, OrderMas.BuyOrdNo, TempIoHisLedger
.Slno, TempIoHisLedger.TrsType, TempIoHisLedger.Pname, TempIoHisLedger.Deptname, TempIoHisLedger.DCNo, TempIoHisLedger.DCFinyear, TempIoHisLedger.DcDate, TempIoHisLedger.DItemDesc, TempIoHisLedger.Dia, TempIoHisLedger.RecDia, TempIoHisLedger.DcBags, 
 TempIoHisLedger.DcKgs, TempIoHisLedger.Dcmtr, TempIoHisLedger.Grnno, TempIoHisLedger.GrnFinyear, TempIoHisLedger.GTrsType, TempIoHisLedger.GrnDate, TempIoHisLedger.PDCRef, TempIoHisLedger.GItemDesc, TempIoHisLedger.RecBags, TempIoHisLedger.RecKgs,  TempIoHisLedger.Recmtr, TempIoHisLedger.Uom, TempIoHisLedger.RUOM, Mas_Dept.OrderSno AS DeptSlno, OrderMas.Finyear AS Iofinyear, OrderMas.Jobno, TempIoHisLedger.CloseFlg, Mas_Merchandiser.MerchName, OrderMas2.DelDt, Mas_Buyer.ShortBuyer, OrderMas.OrderQty,  OrderMas.uom AS OrderUom, isnull(TempIoHisLedger.DCMainUom,'''') As DCMainUom, Isnull(TempIoHisLedger.RecMainUom,'''') As RecMainUom, TempIoHisLedger.DeptId, TmpUom.Uom1, TmpUom.uom2, TmpUom.uom3, TmpUom.Uom4, TmpUom.Uom5, TmpUom.uom6, TempIoHisLedger.UomNoDeci, TempIoHisLedger.RUomNoDeci, TempIoHisLedger.DcPro_TYpe,    Isnull(OrdSeq.sl,1000) as ProcessSlno ,External_GRN,TempIoHisLedger.Remark,SubProcess FROM TempIoHisLedger_Others TempIoHisLedger INNER JOIN Mas_Exporter ON TempIoHisLedger.Coycode = Mas_Exporter.ExpID INNER JOIN OrderMas ON TempIoHisLedger.OrdId = OrderMas.OrdId INNER JOIN OrderMas2 ON OrderMas.Ordid = OrderMas2.Ordid INNER JOIN Mas_Buyer ON OrderMas.BuyerID =    Mas_Buyer.BuyerID LEFT OUTER JOIN OrdSeq ON TempIoHisLedger.OrdId = OrdSeq.OrdID AND TempIoHisLedger.DeptId = OrdSeq.Prs LEFT OUTER JOIN Mas_Merchandiser ON OrderMas.MerchID = Mas_Merchandiser.MerchID LEFT OUTER JOIN Mas_Dept ON TempIoHisLedger.DeptId = Mas_Dept.DeptID    LEFT OUTER JOIN TmpUom ON TmpUom.Ordid = TempIoHisLedger.Pid WHERE TempIoHisLedger.Ordid=@OrdID and TempIoHisLedger.IPAddress=@IPAddress ORDER BY Mas_Dept.OrderSno, TempIoHisLedger.Slno , TempIoHisLedger.DcNo, TempIoHisLedger.Grnno 'EXEC SP_EXECUTESQL @SQLSTR,N'@OrdId int,@IPAddress nVarchar(25)',	@OrdID=@OrdID,@IPAddress=@IPAddress End