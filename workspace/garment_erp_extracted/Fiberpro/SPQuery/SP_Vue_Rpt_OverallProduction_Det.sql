/*;=============================================   
; Author           :  Global Software's    
; Create date      :  31/12/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SHIFTWAGES REG
; Change Person    :  M.SUGANYA 
; Last Change Date :  08/05/2025 09.30 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_Rpt_OverallProduction_Det   AS 

BEGIN 

DECLARE @sql1 NVARCHAR(MAX);

SET @sql1 = ' ALTER VIEW Vue_Rpt_OverallProduction_Det As 

Select X.Coycode,X.ExporterName,X.OrdId,X.StyleNo,X.StyleDesc,X.WorkComplDet,X.OrderSno,X.Dt,X.ColorDesc,X.PartName, IsNull(Sum(X.StockQty),0) As ProdQty,(Select Sum(Y.OrdQty) FROM (Select Sum(OrderQty) OrdQty From OrderQtyDtl Where OrdId=X.OrdId And StyleNo=X.StyleNo And X.ColID = OrderQtyDtl.ColID and X.PARTID = OrderQtyDtl.PartID And X.PARTID <> 0 UNION Select  Sum(OrderQty) OrdQty From OrderQtyDtl Where OrdId=X.OrdId And StyleNo=X.StyleNo And X.ColID = OrderQtyDtl.CmbClrID AND X.PARTID =0  And X.EntryOption =1 UNION Select  Sum(SizeQty) OrdQty From OrdQtyClrDtl Where OrdId=X.OrdId And StyleNo=X.StyleNo And X.ColID = OrdQtyClrDtl.CmbClrID AND X.PARTID =0  And X.EntryOption =2 )Y) As  OrderQty,(Select Sum(Y.OrdQtyExs) FROM (Select Sum(CutPlanQty) OrdQtyExs From OrderQtyDtl Where OrdId=X.OrdId And StyleNo=X.StyleNo And X.ColID = OrderQtyDtl.ColID and 
X.PARTID = OrderQtyDtl.PartID And X.PARTID <> 0 UNION Select Sum(CutPlanQty) OrdQtyExs From OrderQtyDtl Where OrdId=X.OrdId And StyleNo=X.StyleNo And X.ColID = OrderQtyDtl.CmbClrID AND X.PARTID =0  And X.EntryOption =1 UNION Select  Sum(SizeQty)+Round(sum(SizeQty * Exs_Per)/100,0) OrdQtyExs From OrdQtyClrDtl Where OrdId=X.OrdId And StyleNo=X.StyleNo And X.ColID = OrdQtyClrDtl.CmbClrID AND X.PARTID =0  And X.EntryOption =2 )Y) As  OrderQtyExs,
X.StageID,X.ColID,X.PARTID,X.EntryOption From (


SELECT Coycode,ExporterName,OrdId,StyleNo,StyleDesc,WorkComplDet,
  OrderSno,Dt,ColorDesc,PartName ,SizId, SUM(IsNull(StockQty,0)) As StockQty,StageID,ColID,PARTID,EntryOption FROM (
 Select Distinct Trs_Prodentry.CoyId As Coycode,Mas_Exporter.ExporterName,Trs_Prodentry.OrdId,Trs_Prodentry.StyleNo,Mas_StyleDesc.StyleDesc,Mas_JobWrkComp.WorkComplDet,
  Mas_Dept.OrderSno,Dt,ColorDesc,PartName ,Trs_ProdentryQty.SizId, IsNull(Trs_ProdentryQty.ProdPcs,0) As StockQty,Trs_Prodentry.StageID,Trs_Prodentry.ClrId as ColID,Trs_Prodentry.PARTID,EntryOption, Trs_Prodentry.id From Trs_Prodentry Inner Join Trs_ProdentryQty On Trs_Prodentry.Id=Trs_ProdentryQty.Id Inner 
Join Mas_Exporter On Trs_Prodentry.CoyId=Mas_Exporter.ExpId /*Chandru*/left Join OrderQtyDtl On Trs_Prodentry.OrdId=OrderQtyDtl.OrdId 
And Trs_Prodentry.StyleNo=OrderQtyDtl.StyleNo And Trs_Prodentry.ClrId=OrderQtyDtl.ColId And Trs_ProdentryQty.SizId=OrderQtyDtl.SizeId 
Left JOIN OrderStyleDtl ON OrderQtyDtl.Ordid = OrderStyleDtl.Ordid and OrderQtyDtl.StyleNo = OrderStyleDtl.StyleNo 
/*Chandru*/left Join Mas_StyleDesc On OrderQtyDtl.StyleId=Mas_StyleDesc.StyleId Inner Join Mas_JobWrkComp On Trs_Prodentry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId  INNER JOIN Mas_Color on Trs_Prodentry.ClrId = Mas_Color.ColID  LEFT JOIN Mas_Part ON Trs_Prodentry.PARTID = Mas_Part.PartID  WHERE Mas_JobWrkComp.PcsType in(''Piece'',''Bit'')    And /*OrderStyleDtl.EntryOption =1 */Trs_Prodentry.PARTID <>0 )Z GROUP BY Coycode,ExporterName,OrdId,StyleNo,StyleDesc,WorkComplDet,
  OrderSno,Dt,ColorDesc,PartName ,SizId,StageID,ColID,PARTID,EntryOption 





 UNION ALL


 SELECT Coycode,ExporterName,OrdId,StyleNo,StyleDesc,WorkComplDet,
  OrderSno,Dt,ColorDesc,''ALL'' as PartName ,SizId, SUM(IsNull(StockQty,0)) As StockQty,StageID,ColID,PARTID,EntryOption FROM (
 Select Distinct Trs_Prodentry.CoyId As Coycode,Mas_Exporter.ExporterName,Trs_Prodentry.OrdId,Trs_Prodentry.StyleNo,Mas_StyleDesc.StyleDesc,Mas_JobWrkComp.WorkComplDet,
  Mas_Dept.OrderSno,Dt,ColorDesc,''ALL'' as PartName ,Trs_ProdentryQty.SizId, IsNull(Trs_ProdentryQty.ProdPcs,0) As StockQty,Trs_Prodentry.StageID,Trs_Prodentry.ClrId as ColID,Trs_Prodentry.PARTID,EntryOption, Trs_Prodentry.id  From Trs_Prodentry Inner Join Trs_ProdentryQty On Trs_Prodentry.Id=Trs_ProdentryQty.Id Inner Join Mas_Exporter On Trs_Prodentry.CoyId=Mas_Exporter.ExpId Inner Join (Select Ordid,Styleno,Cmbclrid as ColId,SizeId,StyleID from OrderQtyDtl group by Ordid,Styleno,Styleid,Cmbclrid,SizeId) as OrderQtyDtl On Trs_Prodentry.OrdId=OrderQtyDtl.OrdId 
And Trs_Prodentry.StyleNo=OrderQtyDtl.StyleNo And Trs_Prodentry.ClrId=OrderQtyDtl.ColId And Trs_ProdentryQty.SizId=OrderQtyDtl.SizeId 
INNER JOIN OrderStyleDtl ON OrderQtyDtl.Ordid = OrderStyleDtl.Ordid and OrderQtyDtl.StyleNo = OrderStyleDtl.StyleNo 
Inner Join Mas_StyleDesc On OrderQtyDtl.StyleId=Mas_StyleDesc.StyleId Inner Join Mas_JobWrkComp On Trs_Prodentry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId  INNER JOIN Mas_Color on Trs_Prodentry.ClrId = Mas_Color.ColID 
 WHERE Mas_JobWrkComp.PcsType =''Piece''  And /*OrderStyleDtl.EntryOption =2  */ Trs_Prodentry.PARTID=0 ) Z GROUP BY Coycode,ExporterName,OrdId,StyleNo,StyleDesc,WorkComplDet,
  OrderSno,Dt,ColorDesc,SizId, StageID,ColID,PARTID,EntryOption

 

 Union All 


 SELECT Coycode,ExporterName,OrdId,StyleNo,StyleDesc,WorkComplDet,OrderSno,Dt,
  ColorDesc,PartName ,SizId, SUM(IsNull(StockQty,0)) As StockQty,StageID,ColID,PARTID,EntryOption FROM (
 Select Distinct Trs_PcsGrn1.Coycode,Mas_Exporter.ExporterName,Trs_PcsGrn1.OrdJob As   OrdId,Trs_PcsGrn2.StyleNo,Mas_StyleDesc.StyleDesc,Mas_JobWrkComp.WorkComplDet,Mas_Dept.OrderSno,Dt,
  ColorDesc,PartName ,Trs_PcsGrn2.SizId, IsNull(Trs_PcsGrn2.RecPcs,0) As StockQty,Trs_PcsGrn1.TargetStageID as StageID,Trs_PcsGrn2.ColID,Trs_PcsGrn2.PARTID,EntryOption, Trs_PcsGrn1.ID From Trs_PcsGrn1 Inner Join  Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id Inner Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id Inner Join Mas_Exporter On Trs_PcsGrn1.Coycode=Mas_Exporter.ExpId/*Chandru*/ left Join 
OrderQtyDtl On Trs_PcsGrn1.OrdJob=OrderQtyDtl.OrdId And Trs_PcsGrn2.StyleNo=OrderQtyDtl.StyleNo And Trs_PcsGrn2.ColId=OrderQtyDtl.ColId And Trs_PcsGrn2.SizId=OrderQtyDtl.SizeId  left JOIN OrderStyleDtl ON OrderQtyDtl.Ordid = OrderStyleDtl.Ordid and OrderQtyDtl.StyleNo = OrderStyleDtl.StyleNo/*Chandru*/  left Join Mas_StyleDesc On OrderQtyDtl.StyleId=Mas_StyleDesc.StyleId Inner Join Mas_JobWrkComp On Trs_PcsGrn3.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId  INNER JOIN Mas_Color on Trs_PcsGrn2.ColID = Mas_Color.ColID  LEFT JOIN Mas_Part ON Trs_PcsGrn2.PARTID = Mas_Part.PartID  WHERE Mas_JobWrkComp.PcsType in(''Piece'',''Bit'')   And /*OrderStyleDtl.EntryOption =1 */ Trs_PcsGrn2.PARTID <>0 ) Z GROUP BY Coycode,ExporterName,OrdId,StyleNo,StyleDesc,WorkComplDet,OrderSno,Dt,
  ColorDesc,PartName ,SizId,StageID,ColID,PARTID,EntryOption 



 Union All 


 SELECT Coycode,ExporterName, OrdId,StyleNo,StyleDesc,WorkComplDet,OrderSno,Dt, ColorDesc,''All'' as PartName ,SizId, SUM(IsNull(StockQty,0)) As StockQty, StageID,ColID,PARTID,EntryOption FROM (
 Select Distinct Trs_PcsGrn1.Coycode,Mas_Exporter.ExporterName,Trs_PcsGrn1.OrdJob As OrdId,Trs_PcsGrn2.StyleNo,Mas_StyleDesc.StyleDesc,Mas_JobWrkComp.WorkComplDet,Mas_Dept.OrderSno,Dt, ColorDesc,''All'' as PartName ,Trs_PcsGrn2.SizId, IsNull(Trs_PcsGrn2.RecPcs,0) As StockQty,Trs_PcsGrn1.TargetStageID as StageID,Trs_PcsGrn2.ColID,Trs_PcsGrn2.PARTID,EntryOption, Trs_PcsGrn1.ID From Trs_PcsGrn1 Inner Join  Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id Inner Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id Inner Join Mas_Exporter On Trs_PcsGrn1.Coycode=Mas_Exporter.ExpId Inner Join   (Select Ordid,Styleno,Cmbclrid as ColId,SizeId,StyleID from OrderQtyDtl group by Ordid,Styleno,Styleid,Cmbclrid,SizeId) as OrderQtyDtl On Trs_PcsGrn1.OrdJob=OrderQtyDtl.OrdId And Trs_PcsGrn2.StyleNo=OrderQtyDtl.StyleNo And Trs_PcsGrn2.ColId=OrderQtyDtl.ColId And Trs_PcsGrn2.SizId=OrderQtyDtl.SizeId  INNER JOIN OrderStyleDtl ON OrderQtyDtl.Ordid = OrderStyleDtl.Ordid and OrderQtyDtl.StyleNo = OrderStyleDtl.StyleNo   Inner Join Mas_StyleDesc On OrderQtyDtl.StyleId=Mas_StyleDesc.StyleId Inner Join Mas_JobWrkComp On Trs_PcsGrn3.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On  Mas_JobWrkComp.DeptId=Mas_Dept.DeptId  INNER JOIN Mas_Color on Trs_PcsGrn2.ColID = Mas_Color.ColID  WHERE Mas_JobWrkComp.PcsType =''Piece'' And /*OrderStyleDtl.EntryOption =2 */Trs_PcsGrn2.PARTID = 0 ) Z GROUP BY  Coycode,ExporterName, OrdId,StyleNo,StyleDesc,WorkComplDet,OrderSno,Dt, ColorDesc,SizId, StageID,ColID,PARTID,EntryOption
 
 
 ) X Group By X.Coycode,X.ExporterName,X.OrdId,X.StyleNo,X.StyleDesc,X.WorkComplDet,X.OrderSno,X.Dt,X.ColorDesc,X.PartName, X.StageID,X.ColID,X.PARTID ,X.EntryOption'







EXEC sp_executesql @sql1 







END











-- SP_Vue_RptShiftWagesReg 