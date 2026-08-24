/*;=============================================   
; Author           :  Global Software's    
; Create date      :  29/09/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  29/09/2022 10.05 AM 
; =============================================  */  

CREATE PROCEDURE [dbo].[SP_Rpt_StockRegQry1] (@TmpStr as Nvarchar(Max)) AS  
BEGIN DECLARE @SQLSTR AS NVARCHAR(Max) 
 
 Set @SQLSTR=N'SELECT Mas_Exporter.ExporterName, OrderMas.OrdId, OrderMas.BuyOrdNo,Mas_Dept.OrderSno, Mas_Dept.Deptname, Mas_Count.CountName, Mas_Color.ColorDesc, SUM(CurrentStock.Bg) AS StkBg, dbo.FN_Add_BoostupPer(SUM(CurrentStock.Kg)) AS StkKg, dbo.FN_Add_BoostupPer(SUM(CurrentStock.Mt)) AS StkMtr, Mas_Fabric.Fabdesc, Mas_Dia.Dia, StockTable.Gsm, StockTable.GG,StockTable.Lotno, StockTable.ll, Mas_Uom.Uom,isnull(StockTable.Rate,0) as Rate, Mas_Godown.GodName  , Isnull(Mas_Design.DesignDesc,'''') As DesignDesc  ,stocktable.stockid, stocktable.cntid,stocktable.colid,stocktable.print_designid,stocktable.fabid,stocktable.dept FROM         CurrentStock INNER JOIN  StockTable ON CurrentStock.StockID = StockTable.StockID And CurrentStock.OrdID = StockTable.OrdID INNER JOIN Mas_Exporter ON StockTable.Coycode = Mas_Exporter.ExpID INNER JOIN Mas_Dept ON StockTable.Dept = Mas_Dept.DeptID INNER JOIN OrderMas ON StockTable.OrdID = OrderMas.OrdId INNER JOIN Mas_Fabric ON StockTable.FabID = Mas_Fabric.FabID INNER JOIN Mas_Dia ON StockTable.DiaID = Mas_Dia.DiaID INNER JOIN Mas_Godown ON CurrentStock.GodID = Mas_Godown.GodID LEFT OUTER JOIN Mas_Design ON StockTable.PRINT_DESIGNID = Mas_Design.DesignId LEFT OUTER JOIN Mas_Uom ON Mas_Fabric.PriUomID = Mas_Uom.UomID LEFT OUTER JOIN Mas_Count ON StockTable.CntID = Mas_Count.CountID LEFT OUTER JOIN Mas_Color ON StockTable.ColID = Mas_Color.ColID where ' + @TmpStr   Begin Set @SQLSTR=@SQLSTR+ N' GROUP BY Mas_Exporter.ExporterName, OrderMas.OrdId, OrderMas.BuyOrdNo, Mas_Dept.Deptname, Mas_Count.CountName, Mas_Color.ColorDesc, Mas_Fabric.Fabdesc, Mas_Dia.Dia, StockTable.Gsm, StockTable.GG, StockTable.ll, Mas_Uom.Uom,StockTable.Lotno,Mas_Dept.Ordersno,isnull(StockTable.Rate,0), Mas_Godown.GodName , Isnull(Mas_Design.DesignDesc,'''') ,stocktable.stockid ,stocktable.cntid,stocktable.colid,stocktable.print_designid,stocktable.fabid ,stocktable.dept HAVING (SUM(CurrentStock.Kg) > 0) OR (SUM(CurrentStock.Mt) > 0)' END  
 EXEC SP_EXECUTESQL @SQLSTR,N'@TmpStr nvarchar(MAx)',@TmpStr=@TmpStr
 End