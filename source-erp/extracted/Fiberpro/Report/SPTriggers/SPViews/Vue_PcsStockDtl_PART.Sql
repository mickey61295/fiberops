/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  16/JUL/2018                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for pcs stock view
; Change Person  :  ASLAM                
; Last Change Date :  28/Dec/2022 10.26 AM                  
; =============================================   */  
CREATE VIEW Vue_PcsStockDtl_PART AS   
SELECT     'Is' AS Trn, dbo.Trs_Pcs1.Coycode, dbo.Trs_Pcs1.Ordjobno, dbo.Trs_Pcs2.ColID, dbo.Trs_Pcs2.StyleID, dbo.Trs_Pcs2.SizeID, 0 AS Rec, SUM(dbo.Trs_Pcs2.Pcs) AS Iss, dbo.Trs_Pcs2.StyleNo, 'F' AS SemiFinish, dbo.
Trs_Pcs2.PartID, Trs_Pcs1.GodID FROM         dbo.Trs_Pcs1 INNER JOIN dbo.Trs_Pcs2 ON dbo.Trs_Pcs1.ID = dbo.Trs_Pcs2.ID  WHERE     (dbo.Trs_Pcs1.PcsPanel = 'Piece') AND (dbo.Trs_Pcs1.DelType = 'Despatch')   GROUP BY dbo.Trs_Pcs1.Coycode, dbo.Trs_Pcs1.Ordjobno,dbo.Trs_Pcs2.ColID, dbo.Trs_Pcs2.SizeID, dbo.Trs_Pcs2.StyleID, dbo.Trs_Pcs2.StyleNo, dbo.Trs_Pcs2.PartID, Trs_Pcs1.GodID   

UNION ALL    

SELECT     'Is' AS Trn, Trs_Pcs1_1.Coycode, Trs_Pcs1_1.Ordjobno, Trs_Pcs2_1.ColID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.SizeID, 0 AS Rec, SUM(Trs_Pcs2_1.Pcs)AS Iss, Trs_Pcs2_1.StyleNo, ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S') AS SemiFinish, Trs_Pcs2_1.PartID, Trs_Pcs1_1.GodID FROM         dbo.Trs_Pcs1 AS Trs_Pcs1_1 INNER JOIN   dbo.Trs_Pcs2 AS Trs_Pcs2_1 ON Trs_Pcs1_1.ID = Trs_Pcs2_1.ID INNER JOIN   dbo.Mas_Dept ON Trs_Pcs1_1.Dept = dbo.Mas_Dept.DeptID  WHERE     (Trs_Pcs1_1.PcsPanel = 'Piece') AND (Trs_Pcs1_1.DelType NOT IN ('Despatch', 'Transfer'))  GROUP BY Trs_Pcs1_1.Coycode, Trs_Pcs1_1.Ordjobno, Trs_Pcs2_1.ColID, Trs_Pcs2_1.SizeID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.StyleNo,ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S'), Trs_Pcs2_1.PartID, Trs_Pcs1_1.GodID  

UNION ALL   

SELECT     'Rec' AS Trn, dbo.Trs_PcsGrn1.Coycode, dbo.Trs_PcsGrn1.OrdJob, dbo.Trs_PcsGrn2.ColID, dbo.Trs_PcsGrn2.StyleID , dbo.Trs_PcsGrn2.SizID,SUM(dbo.Trs_PcsGrn2.RecPcs) AS RecPcs, 0 AS IssPcs, dbo.Trs_PcsGrn2.StyleNo, ISNULL(Mas_Dept_2.SEMIFINISH, 'S'
) AS SemiFinish, dbo.Trs_PcsGrn2.PARTID, Trs_PcsGrn1.GodID  FROM dbo.Trs_PcsGrn1 INNER JOIN Trs_PcsGrn2 ON dbo.Trs_PcsGrn1.ID = dbo.Trs_PcsGrn2.ID INNER JOIN   dbo.Mas_Dept AS Mas_Dept_2 ON dbo.Trs_PcsGrn1.Dept = Mas_Dept_2.DeptID  WHERE     (dbo.Trs_PcsGrn2.PanelID = 0)  GROUP BY dbo.Trs_PcsGrn1.Coycode, dbo.Trs_PcsGrn1.OrdJob, dbo.Trs_PcsGrn2.ColID, dbo.Trs_PcsGrn2.StyleID, dbo.Trs_PcsGrn2.SizID,   dbo.Trs_PcsGrn2.StyleNo, ISNULL(Mas_Dept_2.SEMIFINISH, 'S'), dbo.Trs_PcsGrn2.PARTID, Trs_PcsGrn1.GodID  

UNION ALL   

SELECT     'Prod' AS Trn, dbo.Trs_Prodentry.CoyId, dbo.Trs_Prodentry.OrdId, dbo.Trs_Prodentry.ClrId,  dbo.Trs_Prodentry.StyleId, dbo.Trs_ProdentryQty.SizId,SUM(dbo.Trs_ProdentryQty.ProdPcs) AS RecPcs, 0 AS IssPcs, dbo.Trs_Prodentry.StyleNo, ISNULL(Mas_Dept_1.SEMIFINISH, 'S') AS SemiFinish,dbo.Trs_Prodentry.PARTID, Trs_ProdEntry.GodID FROM dbo.Trs_Prodentry INNER JOIN  dbo.Mas_JobWrkComp ON dbo.Trs_Prodentry.StageID = dbo.Mas_JobWrkComp.Id INNER JOIN  dbo.Mas_Dept AS Mas_Dept_1 ON dbo.Mas_JobWrkComp.DeptId
 = Mas_Dept_1.DeptID INNER JOIN  dbo.Trs_ProdentryQty ON dbo.Trs_Prodentry.id = dbo.Trs_ProdentryQty.id  WHERE    (dbo.Trs_Prodentry.StageID = 1) AND (dbo.Trs_Prodentry.Rework = 0)  GROUP BY dbo.Trs_Prodentry.CoyId, dbo.Trs_Prodentry.OrdId, dbo.Trs_Prodentry.ClrId, dbo.Trs_Prodentry.StyleId, dbo.Trs_ProdentryQty.SizId,dbo.Trs_Prodentry.StyleNo, ISNULL(Mas_Dept_1.SEMIFINISH, 'S'), dbo.Trs_Prodentry.PARTID, Trs_ProdEntry.GodID  



Union All   

SELECT     'Prod' AS Trn, dbo.Trs_Prodentry.CoyId, dbo.Trs_Prodentry.OrdId, dbo.Trs_Prodentry.ClrId,  dbo.Trs_Prodentry.StyleId, dbo.Trs_ProdentryQty.SizId,SUM(dbo.Trs_ProdentryQty.ProdPcs) AS RecPcs, 0 AS IssPcs, dbo.Trs_Prodentry.StyleNo, ISNULL(Mas_Dept_1.SEMIFINISH, 'S') AS SemiFinish,dbo.Trs_Prodentry.PARTID, Trs_ProdEntry.GodID FROM dbo.Trs_Prodentry INNER JOIN  dbo.Mas_JobWrkComp ON dbo.Trs_Prodentry.StageID = dbo.Mas_JobWrkComp.Id INNER JOIN  dbo.Mas_Dept AS Mas_Dept_1 ON dbo.Mas_JobWrkComp.DeptId
 = Mas_Dept_1.DeptID INNER JOIN  dbo.Trs_ProdentryQty ON dbo.Trs_Prodentry.id = dbo.Trs_ProdentryQty.id  WHERE     (dbo.Trs_Prodentry.StageID <> 1) AND (dbo.Trs_Prodentry.Rework= 0 )  GROUP BY dbo.Trs_Prodentry.CoyId, dbo.Trs_Prodentry.OrdId, dbo.Trs_Prodentry.ClrId, dbo.Trs_Prodentry.StyleId, dbo.Trs_ProdentryQty.SizId,dbo.Trs_Prodentry.StyleNo, ISNULL(Mas_Dept_1.SEMIFINISH, 'S'), dbo.Trs_Prodentry.PARTID, Trs_ProdEntry.GodID 


UNION  ALL  

SELECT     'Rec' AS Trn, Trs_Pcs1_1.ToCoycode Coycode, Trs_Pcs1_1.Ordjobno, Trs_Pcs2_1.ColID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.SizeID, SUM(Trs_Pcs2_1.Pcs) AS Rec, 0 AS Iss, Trs_Pcs2_1.StyleNo, ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S') AS SemiFinish, Trs_Pcs2_1.PartID, Trs_UnitAck1.GodID FROM         dbo.Trs_Pcs1 AS Trs_Pcs1_1 INNER JOIN   dbo.Trs_Pcs2 AS Trs_Pcs2_1 ON Trs_Pcs1_1.ID = Trs_Pcs2_1.ID INNER JOIN   dbo.Mas_Dept ON Trs_Pcs1_1.Dept = dbo.Mas_Dept.DeptID Inner Join Trs_UnitAck2 On Trs_Pcs1_1.ID =  Trs_UnitAck2.TransID INNER JOIN Trs_UnitAck1 ON Trs_UnitAck1.ID = Trs_UnitAck2.Id  WHERE     (Trs_Pcs1_1.PcsPanel = 'Piece' or Trs_Pcs1_1.PcsPanel = 'Bit') AND (Trs_Pcs1_1.DelType IN ('Unit Transfer'))  GROUP BY Trs_Pcs1_1.ToCoycode, Trs_Pcs1_1.Ordjobno,  Trs_Pcs2_1.ColID, Trs_Pcs2_1.SizeID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.StyleNo,ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S'), Trs_Pcs2_1.PartID, Trs_UnitAck1.GodID 

UNION ALL 

SELECT     'Rec' AS Trn, Trs_Pcs1_1.Coycode, Trs_Pcs1_1.Ordjobno, Trs_Pcs2_1.ColID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.SizeID, SUM(Trs_Pcs2_1.Pcs) AS Rec, 0 AS Iss, Trs_Pcs2_1.StyleNo, ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S') AS SemiFinish, Trs_Pcs2_1.PartID, Trs_PcsGodAck1.GodID FROM         dbo.Trs_Pcs1 AS Trs_Pcs1_1 INNER JOIN   dbo.Trs_Pcs2 AS Trs_Pcs2_1 ON Trs_Pcs1_1.ID = Trs_Pcs2_1.ID INNER JOIN   dbo.Mas_Dept ON Trs_Pcs1_1.Dept = dbo.Mas_Dept.DeptID Inner Join Trs_PcsGodAck2 On Trs_Pcs1_1.ID = Trs_PcsGodAck2.TransID INNER JOIN Trs_PcsGodAck1 ON Trs_PcsGodAck1.ID = Trs_PcsGodAck2.Id  WHERE  

   (Trs_Pcs1_1.PcsPanel = 'Piece') AND (Trs_Pcs1_1.DelType IN ('Godown Transfer'))  GROUP BY Trs_Pcs1_1.Coycode, Trs_Pcs1_1.Ordjobno, Trs_Pcs2_1.ColID, Trs_Pcs2_1.SizeID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.StyleNo,ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S'), Trs_Pcs2_1.PartID, Trs_PcsGodAck1.GodID  

   UNION ALL    

   SELECT     'STKTFR' AS Trn, dbo.Trs_PcsStockTfr1.Coycode, dbo.Trs_PcsStockTfr1.ToOrdId as Ordid , dbo.Trs_PcsStockTfr2.ColID , dbo.OrderStyleDtl.StyleID, dbo.Trs_PcsStockTfr2.SizeId as sizid,SUM(dbo.Trs_PcsStockTfr2.TfrPcs) AS RecPcs, 0 AS IssPcs, dbo.
Trs_PcsStockTfr1.ToStyleNo, ISNULL(Mas_Dept_2.SEMIFINISH, 'S') AS SemiFinish, dbo.Trs_PcsStockTfr1.ToPartId as partid, Trs_PcsStockTfr1.GodID  FROM dbo.Trs_PcsStockTfr1 INNER JOIN Trs_PcsStockTfr2 ON dbo.Trs_PcsStockTfr1 .ID = dbo.Trs_PcsStockTfr2.ID INNER JOIN OrderStyleDtl ON Trs_PcsStockTfr1.ToOrdId = OrderStyleDtl.OrdID And Trs_PcsStockTfr1.ToStyleNo = OrderStyleDtl.StyleNo INNER JOIN  dbo.Mas_JobWrkComp ON dbo.Trs_PcsStockTfr1.StageID = dbo.Mas_JobWrkComp.Id INNER JOIN   dbo.Mas_Dept AS Mas_Dept_2 ON
 dbo.Mas_JobWrkComp.DeptId = Mas_Dept_2.DeptID  GROUP BY dbo.Trs_PcsStockTfr1.Coycode, dbo.Trs_PcsStockTfr1.ToOrdId, dbo.Trs_PcsStockTfr2.ColID, dbo.OrderStyleDtl.StyleID, dbo.Trs_PcsStockTfr2.SizeID,   dbo.Trs_PcsStockTfr1.ToStyleNo, ISNULL(Mas_Dept_2.SEMIFINISH, 'S'), dbo.Trs_PcsStockTfr1.ToPartId, Trs_PcsStockTfr1.GodID  

   UNION ALL 

   SELECT     'STKOPEN' AS Trn, dbo.Trs_PcsAdj1.Coycode, dbo.Trs_PcsAdj1.OrdId as Ordid , dbo.Trs_PcsAdj1.ColID , OrderStyleDtl.StyleID, dbo.Trs_PcsAdj2.SizeId as sizid,SUM(dbo.Trs_PcsAdj2.Pcs) AS RecPcs, 0 AS IssPcs, Trs_PcsAdj1.styleno, ISNULL(Mas_Dept_2.SEMIFINISH, 'S') AS SemiFinish, dbo.Trs_PcsAdj1.PartId as partid, Trs_PcsAdj2.GodID  FROM dbo.Trs_PcsAdj1 INNER JOIN Trs_PcsAdj2 ON

 dbo.Trs_PcsAdj1.ID = dbo.Trs_PcsAdj2.ID INNER JOIN OrderStyleDtl ON Trs_PcsAdj1.OrdId = OrderStyleDtl.OrdID INNER JOIN  dbo.Mas_JobWrkComp ON dbo.Trs_PcsAdj1.StageID = dbo.Mas_JobWrkComp.Id INNER JOIN   dbo.Mas_Dept AS Mas_Dept_2 ON dbo.Mas_JobWrkComp.DeptId = Mas_Dept_2.DeptID WHERE Adj_Missing_Flg='O' GROUP BY dbo.Trs_PcsAdj1.Coycode, dbo.Trs_PcsAdj1.OrdId, dbo.Trs_PcsAdj1.ColID, dbo.OrderStyleDtl.StyleID, dbo.Trs_PcsAdj2.SizeID,   dbo.Trs_PcsAdj1.StyleNo, ISNULL(Mas_Dept_2.SEMIFINISH, 'S'), dbo.Trs_PcsAdj1.PartId, Trs_PcsAdj2.GodID 

UNION ALL

 SELECT     'Prod' AS Trn, Trs_Prodentry.CoyId, Trs_Prodentry.OrdId, Trs_Prodentry.ClrId,  Trs_Prodentry.StyleId, Trs_ProdentryQty.SizId,SUM(Trs_ProdentryQty.ProdPcs) AS RecPcs, 0 AS IssPcs, Trs_Prodentry.StyleNo, ISNULL(Mas_Dept_1.SEMIFINISH, 'S') AS SemiFinish,Trs_Prodentry.PARTID, Trs_ProdEntry.GodID FROM Trs_AddPanelEntry as Trs_Prodentry INNER JOIN  Mas_JobWrkComp ON Trs_Prodentry.StageID = Mas_JobWrkComp.Id INNER JOIN  Mas_Dept AS Mas_Dept_1 ON Mas_JobWrkComp.DeptId = Mas_Dept_1.DeptID INNER JOIN  Trs_AddPanelentryQty as Trs_ProdentryQty ON Trs_Prodentry.id = Trs_ProdentryQty.id  WHERE    (Trs_Prodentry.StageID = 1) AND (Trs_Prodentry.Rework = 0)  GROUP BY Trs_Prodentry.CoyId, Trs_Prodentry.OrdId, Trs_Prodentry.ClrId, Trs_Prodentry.StyleId, Trs_ProdentryQty.SizId,Trs_Prodentry.StyleNo, ISNULL(Mas_Dept_1.SEMIFINISH, 'S'), Trs_Prodentry.PARTID, Trs_ProdEntry.GodID  

UNION ALL
SELECT     'Rec' AS Trn, Trs_Pcs1_1.ToCoycode Coycode, Trs_Pcs1_1.Ordjobno, Trs_Pcs2_1.ColID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.SizeID, SUM(Trs_Pcs2_1.Pcs) AS Rec, 0 AS Iss, Trs_Pcs2_1.StyleNo, ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S') AS SemiFinish, Trs_Pcs2_1.PartID, Trs_UnitAck1.GodID FROM         dbo.Trs_Pcs1 AS Trs_Pcs1_1 INNER JOIN   dbo.Trs_Pcs2 AS Trs_Pcs2_1 ON Trs_Pcs1_1.ID = Trs_Pcs2_1.ID INNER JOIN   dbo.Mas_Dept ON Trs_Pcs1_1.Dept = dbo.Mas_Dept.DeptID Inner Join Trs_UnitAck2 On Trs_Pcs1_1.ID =  Trs_UnitAck2.TransID INNER JOIN Trs_UnitAck1 ON Trs_UnitAck1.ID = Trs_UnitAck2.Id  WHERE    (Trs_Pcs1_1.DelType IN ('Unit Transfer-Panel'))  GROUP BY Trs_Pcs1_1.ToCoycode, Trs_Pcs1_1.Ordjobno,  Trs_Pcs2_1.ColID, Trs_Pcs2_1.SizeID, Trs_Pcs2_1.StyleID, Trs_Pcs2_1.StyleNo,ISNULL(dbo.Mas_Dept.SEMIFINISH, 'S'), Trs_Pcs2_1.PartID, Trs_UnitAck1.GodID 
