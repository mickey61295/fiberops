/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  14/Sep/2022                  
; Create By  :  SHAJAHAN                  
; Description  :  Stored Procedure for Multiprocess GRN
; Change Person  :  ASLAM                
; Last Change Date :  02/Dec/2025 10.00 AM                  
; =============================================   */  

CREATE VIEW Vue_Budget_Det AS 
Select X.ordid,Sum(X.Amount) AS Amount,Sum(X.Amount1) As Amount1,Sum(X.DebitAmount) AS DebitAmount,Sum(X.DebitAmount1) As DebitAmount1,Sum(X.ProdAmount) As ProdAmount, SUM(X.Jobwork) AS Jobwork,Sum(isnull(X.DespPcs,0)) AS DespPcs From (SELECT Trs_Del2.OrdId,SUM(Trs_Del2.Kg * Trs_Del2.rate) AS Amount,0 AS Amount1,0 AS DebitAmount,0 As DebitAmount1,0 As ProdAmount,0 AS Jobwork,0 As DespPcs FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID WHERE (Trs_Del1.TrType IN (3))  GROUP BY Trs_Del2.OrdId 
UNION ALL 
SELECT trs_Del2.TranOrdID,0 AS Amount, SUM(Trs_Del2.Kg * Trs_Del2.rate) AS Amount1,0 As DebitAmount,0 As DebitAmount1,0 As ProdAmount,0 AS Jobwork,0 AS DespPcs FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID WHERE (Trs_Del1.TrType IN (3))  GROUP BY Trs_Del2.TranOrdID 
UNION ALL 
SELECT Trs_DirectDeb1.OrdId,0 As Amount1,0 As Amount2, SUM(
Trs_DirectDeb2.DebQty * Trs_DirectDeb2.Rate) AS DebitAmount,0 As DebitAmount1,0 As ProdAmount,0 AS Jobwork,0 As DespPcs FROM Trs_DirectDeb1 INNER JOIN Trs_DirectDeb2 ON Trs_DirectDeb1.ID = Trs_DirectDeb2.ID INNER JOIN Mas_Dept ON Trs_DirectDeb1.Dept = Mas_Dept.DeptID   And (DeptID <> 16 And isnull(AccProsDept, 'N') = 'N') And Type='D' GROUP BY Trs_DirectDeb1.OrdId 
UNION ALL 
Select Ordid,0 As Amount,0 As Amount1,0 As DebitAmount,0 As DebitAmount1, Isnull(Sum (Qty * Rate),0) As ProdAmount,0 AS Jobwork,0 AS 
DespPcs From ( SELECT Trs_Prodentry.OrdId, IsNull(Trs_Prodentry.Rate,0) As Rate, Trs_ProdentryQty.ProdPcs AS Qty,Trs_Prodentry.StageID FROM Mas_Dept RIGHT OUTER JOIN BudPodet INNER JOIN BudPoMas ON BudPodet.Id = BudPoMas.Id RIGHT OUTER JOIN Trs_ProdentryQty INNER JOIN Trs_Prodentry ON Trs_ProdentryQty.id = Trs_Prodentry.id INNER JOIN Mas_JobWrkComp ON Trs_Prodentry.StageID = Mas_JobWrkComp.Id ON BudPodet.Size = Trs_ProdentryQty.SizId AND BudPodet.PartID = Trs_Prodentry.PartID  AND BudPodet.ColId = Trs_Prodentry.ClrId AND BudPoMas.DeptId = Trs_Prodentry.StageID AND  BudPoMas.OrdId = Trs_Prodentry.OrdId AND BudPodet.StyleNo = Trs_Prodentry.StyleNo ON  Mas_Dept.DeptID = Mas_JobWrkComp.DeptId LEFT OUTER JOIN Trs_ProdExp ON Trs_Prodentry.StyleNo = Trs_ProdExp.StyleNo AND Trs_Prodentry.StageID = Trs_ProdExp.WrkID AND Trs_Prodentry.OrdId = Trs_ProdExp.OrdId LEFT OUTER JOIN Pro_Prod_PartwiseRate ON Trs_ProdExp.Ordid = Pro_Prod_PartwiseRate.OrdID AND Trs_ProdExp.StyleNo = Pro_Prod_PartwiseRate.StyleNo AND Trs_ProdExp.Wrkid = Pro_Prod_PartwiseRate.WrkID AND Trs_ProdEntry.PartID = Pro_Prod_PartwiseRate.PartID left outer join Bud_InhRateclw on Trs_Prodentry.ordid=Bud_InhRateclw.ordid and  Trs_Prodentry.stageid=Bud_InhRateclw.NWork and Trs_Prodentry.styleno=Bud_InhRateclw.styleno and Trs_Prodentry.clrid=Bud_InhRateclw.clrid and Trs_Prodentry.partid=Bud_InhRateclw.partid Inner Join Trs_ProdBill On Trs_Prodentry.BrId=Trs_ProdBill.Id  And TRs_ProdEntry.ReWork =0  and Trs_ProdEntry.StageId=1 
Union All 
Select Trs_ProdShiftWages.OrdId,1 As Rate , Trs_ProdShiftWages.ShiftWages AS Qty,Trs_ProdShiftWages.StageID From Trs_ProdShiftWages Inner Join Mas_JobWrkComp On Trs_ProdShiftWages.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId And Trs_ProdShiftWages.StageId=1 ) as A INNER JOIN Mas_JobWrkComp B ON A.StageID = B.ID  Group by Ordid,WorkComplDet  
UNION ALL 
SELECT Ordjobno AS ordid,0 As Amount,0 As Amount1,0 As DebitAmount,0 As DebitAmount1, 0 As ProdAmount,0 AS Jobwork,isnull(SUM(Trs_Pcs2.
Pcs),0) AS DespPcs FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID WHERE (Trs_Pcs1.DelType = 'Despatch') GROUP By Ordjobno 
UNION ALL 
SELECT Trs_DirectDeb2.OrdId,0 As Amount,0 As Amount1,0 As DebitAmount,SUM(Trs_DirectDeb2.DebQty * Trs_DirectDeb2.Rate) As DebitAmount1, 0 As ProdAmount,0 As Jobwork,0 AS DespPcs FROM Trs_DirectDeb1 INNER JOIN Trs_DirectDeb2 ON Trs_DirectDeb1.ID = Trs_DirectDeb2.ID INNER JOIN Mas_Dept ON Trs_DirectDeb1.Dept = Mas_Dept.DeptID  Where  (DeptID = 16 Or isnull(AccProsDept, 'N') = 'Y') And Type ='D' GROUP BY Trs_DirectDeb2.OrdId 
UNION ALL 
SELECT Trs_Deb2.ordid,0 As Amount,0 As Amount1,SUM(Trs_Deb2.DebKg * Trs_Deb2.Rate) As DebitAmount,0 AS DebitAmount1,0 As ProdAmount,0 AS Jobwork,0 AS DespPcs FROM Trs_Deb1 INNER JOIN Trs_Deb2 ON Trs_Deb1.ID = Trs_Deb2.ID INNER JOIN Mas_Dept ON Trs_Deb1.Dept = Mas_Dept.DeptID WHERE (DeptID <> 16 And isnull(AccProsDept, 'N') = 'N')  GROUP BY Trs_Deb2.OrdId 
UNION ALL 
SELECT  Ordid,0 As Amount,0 As Amount1,0 As DebitAmount,0 AS DebitAmount1,0 As ProdAmount,ISNULL(SUM(Trs_BillRate.NetAmount), 0) AS Jobwork, 0 AS DespPcs FROM Trs_BillRate INNER JOIN Trs_Bills ON Trs_BillRate.ID = Trs_Bills.ID INNER JOIN Mas_JobWrkComp ON Trs_Billrate.dept = Mas_JobWrkComp.ID INNER JOIN Mas_Dept ON Mas_JobWrkComp.deptId 
= Mas_Dept.DeptID WHERE (Trs_BillRate.ID = (SELECT DISTINCT invid FROM Trs_PcsGrn1 Left Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id WHERE Trs_PcsGrn1.Invid = trs_billrate.id AND Trs_PcsGrn1.Invid = trs_bills.id AND StageID = Trs_Billrate.Dept and Trs_PcsGrn1.OrdJob=trs_billrate.OrdId))GROUP BY OrdID )X GROUP BY X.OrdId 
