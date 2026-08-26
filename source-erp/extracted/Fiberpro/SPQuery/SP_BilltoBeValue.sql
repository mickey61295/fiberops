/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  ASLAM

; Last Change Date :  16/12/2025 10.05 AM 

; =============================================  */  

CREATE PROCEDURE SP_BilltoBeValue (@Ordid int) as 

 SELECT   Sum(X.Billvalue) as Amt from (



 Select   IsNull(SUM((Isnull(RecKgs,0)-Isnull(kg,0)) * CASE WHEN trs_Po2.Rate>0 Then trs_Po2.rate ELSE Pro_ReqYarn2.Rate END),0) as billvalue ,'Y' as Flg from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.
StockID INNER JOIN PRo_ReqYarn2 ON B.Ordid = PRo_ReqYarn2.OrdID  and PRo_ReqYarn2.deptid=StockTable.dept and  StockTable.CntID = Pro_ReqYarn2.CountID and StockTable.ColID = PRo_Reqyarn2.ColID LEFT OUTER JOIN Trs_Po2 Trs_Po2 ON StockTable.CntID=Trs_Po2.CntId AND StockTable.ColID=Trs_Po2.ClrId AND B.PoID=Trs_Po2.ID AND StockTable.OrdId=Trs_Po2.OrdId Left Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as Kg,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID)X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID Where B.Ordid=@OrdID  and (B.Invid is null or B.InvID=0) and StockTable.YF='Y' and A.GrnType not in ('Process Return','Sales Return') 



 UNION ALL

/* Select  IsNull(SUM((Isnull(RecKgs,0)-Isnull(kg,0)) * Pro_ReqKnitt2.Rate),0) as billvalue ,'F' as Flg from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON B.Ordid = Pro_
ReqKnitt2.OrdID  And a.Dept

=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.ColID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG =


 Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDiaID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM Left Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as K
g,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID)X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID

  Where B.Ordid=@OrdId and (B.Invid is null or B.InvID=0) and StockTable.YF='F' and A.Dept <>10 and A.GrnType not in ('Process Return','Sales Return')  */



 SELECT ISNUll(SUM(billvalue),0)  AS billvalue ,  'F' as Flg FROM (

 Select  CASE WHEN UPPER(Mas_Uom.Uom)= 'KGS' THEN 

IsNull(SUM((Isnull(RecKgs,0)-Isnull(kg,0)) * Pro_ReqKnitt2.Rate),0) ELSE IsNull(SUM((Isnull(Recmtr,0)-Isnull(Mtr,0)) * Pro_ReqKnitt2.Rate),0) END

 as billvalue from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON B.Ordid = Pro_ReqKnitt2.OrdID  And a.Dept

=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.ColID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG =


 Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDiaID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM 
 
 Left Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as Kg, ISNULL(mtr,0) As Mtr,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID) X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID 
 
 LEFT JOIN Mas_UOM ON Pro_Reqknitt2.RateUOM = Mas_UOM.UOMId   Where B.Ordid=@OrdID and (B.Invid is null or B.InvID=0) and StockTable.YF='F' and A.Dept <>10 and A.GrnType not in ('Process Return','Sales Return') 
 And A.External_GRNID IS NULL  GROUP BY Mas_Uom.Uom )Z 


 UNION
 
 SELECT ISNUll(SUM(billvalue),0)  AS billvalue ,  'F' as Flg FROM (

 Select  CASE WHEN UPPER(Mas_Uom.Uom)= 'KGS' THEN 

IsNull(SUM((Isnull(RecKgs,0)-Isnull(kg,0)) * Pro_ReqKnitt2.Rate),0) ELSE IsNull(SUM((Isnull(Recmtr,0)-Isnull(Mtr,0)) * Pro_ReqKnitt2.Rate),0) END

 as billvalue from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON B.Ordid = Pro_ReqKnitt2.OrdID  And a.Dept

=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.ColID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG =


 Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDiaID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM 
 
 Left Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as Kg, ISNULL(mtr,0) As Mtr,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID) X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID 
 
 LEFT JOIN Mas_UOM ON Pro_Reqknitt2.RateUOM = Mas_UOM.UOMId   Where B.Ordid=@OrdID and (B.Invid is null or B.InvID=0) and StockTable.YF='F' and A.Dept <>10 and A.GrnType not in ('Process Return','Sales Return') 
 And A.External_GRNID IS NOT NULL 
 And A.External_GRNID  in (Select A.ID FRom Trs_MultiPrs_Grn1 A INNER JOIN Trs_MultiPrs_Grn2 B ON A.ID = B.ID WHERE OurDCID in (Select ID From Trs_Del1 WHERE ReprocessType <>'N'))
  GROUP BY Mas_Uom.Uom )Z 







   UNION ALL

/* Select  IsNull(SUM((Isnull(RecKgs,0)-Isnull(kg,0)) * Pro_ReqKnitt2.Rate),0) as billvalue ,'F' as Flg from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON B.Ordid = Pro_
ReqKnitt2.OrdID  And a.Dept

=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.ColID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG =


 Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDiaID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM and StockTable.PRINT_DESIGNID= Pro_ReqKnitt2.DesignID Left
 Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as Kg,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID)X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID

  Where B.Ordid=@OrdId and (B.Invid is null or B.InvID=0) and StockTable.YF='F' and A.Dept =10 and A.GrnType not in ('Process Return','Sales Return') */



 SELECT ISNUll(SUM(billvalue),0)  AS billvalue ,  'F' as Flg FROM (

 Select  CASE WHEN UPPER(Mas_Uom.Uom)= 'KGS' THEN 

IsNull(SUM((Isnull(RecKgs,0)-Isnull(kg,0)) * Pro_ReqKnitt2.Rate),0) ELSE IsNull(SUM((Isnull(Recmtr,0)-Isnull(Mtr,0)) * Pro_ReqKnitt2.Rate),0) END

 as billvalue  from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON B.Ordid = Pro_ReqKnitt2.OrdID  And a.Dept

=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.ColID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG =


 Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDiaID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM and StockTable.PRINT_DESIGNID= Pro_ReqKnitt2.DesignID Left
 Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as Kg, ISNULL(mtr,0) As Mtr,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID)X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID LEFT JOIN Mas_UOM ON Pro_Reqknitt2.RateUOM = Mas_UOM.UOMId

  Where B.Ordid=@OrdID and (B.Invid is null or B.InvID=0) and StockTable.YF='F' and A.Dept =10 and A.GrnType not in ('Process Return','Sales Return')   GROUP BY Mas_Uom.Uom )Z 







 UNION ALL

 /* Select IsNull(Sum(RecKgs * Pro_ReqKnitt2.Rate),0) as billvalue ,'F' as Flg from Trs_MultiPrs_Grn1 A INNER JOIN Trs_MultiPrs_Grn2 B ON A.ID = B.ID 

 INNER JOIN Trs_MultiPrs_Grn3 C ON a.id = c.id AND B.DeptID = C.DeptID 

 INNER JOIN StockTable ON c.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON c.Ordid = Pro_ReqKnitt2.OrdID  And c.DeptID=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.Col
ID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG = Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDi
aID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM Where C.Ordid=@OrdId and (C.Invid is null or C.InvID=0) and StockTable.YF='F' and A.GrnType not in ('Process Return','Sales Return')  and b.FinalProcess <>'Y'  and ProcessType='P' */



SELECT ISNUll(SUM(billvalue),0)  AS billvalue ,  'F' as Flg FROM (

 Select   CASE WHEN UPPER(Mas_Uom.Uom)= 'KGS' THEN IsNull(Sum(RecKgs * Pro_ReqKnitt2.Rate),0) ELSE IsNull(Sum(Recmtr * Pro_ReqKnitt2.Rate),0) END as billvalue from Trs_MultiPrs_Grn1 A INNER JOIN Trs_MultiPrs_Grn2 B ON A.ID = B.ID 

 INNER JOIN Trs_MultiPrs_Grn3 C ON a.id = c.id AND B.DeptID = C.DeptID 

 INNER JOIN StockTable ON c.StockID = StockTable.StockID INNER JOIN Pro_ReqKnitt2 ON c.Ordid = Pro_ReqKnitt2.OrdID  And c.DeptID=Pro_reqknitt2.DeptId And  StockTable.dept = Pro_ReqKnitt2.Deptid AND StockTable.FabID = Pro_ReqKnitt2.FabID AND StockTable.ColID = Pro_ReqKnitt2.ColID  AND StockTable.CntID = Pro_ReqKnitt2.CntID  AND StockTable.GSM = Pro_ReqKnitt2.GSM AND StockTable.GG = Pro_ReqKnitt2.GG AND StockTable.LL = Pro_ReqKnitt2.LL  AND  StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaId AND StockTable.FinDiaID=Pro_ReqKnitt2.FinDiaId AND StockTable.FinGsm=Pro_ReqKnitt2.FinGSM LEFT JOIN Mas_UOM ON Pro_Reqknitt2.RateUOM = Mas_UOM.UOMId Where C.Ordid=@OrdID and (C.Invid is null or C.InvID=0) and StockTable.YF='F' and A.GrnType not in ('Process Return','Sales Return')  and b.FinalProcess <>'Y'  and ProcessType='P'  GROUP BY Mas_Uom.Uom )Z



 

 UNION  ALL Select IsNull(Sum((Isnull(RecKgs,0)-Isnull(kg,0)) * CASE WHEN Trs_Po5.Rate >0 then Trs_Po5.Rate ELSE  Pro_AccBudRate.BudRate END ),0) as billvalue ,'A' as Flg from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID 

= StockTable.StockID INNER JOIN Pro_AccBudRate ON B.Ordid = Pro_AccBudRate.OrdID And StockTable.AType = Pro_AccBudRate.Acc_Type AND StockTable.ADes= Pro_AccBudRate.Acc_Desc  AND StockTable.Siz = Pro_AccBudRate.Siz  AND StockTable.ColId = Pro_AccBudRate.Clr   and a.Dept = Pro_AccBudRate.PrsID  Left Outer Join (Select OurPoid,OurGRNID,Isnull(Kg,0) as Kg,StockId from Trs_Del1 Inner Join Trs_Del2 On Trs_Del1.Id=Trs_del2.ID)X On B.POID = X.OurPoId And X.OurGrnId=A.ID And X.StockId=B.StockID   LEFT JOIN trs_Po5

 on b.POID = trs_po5.id and StockTable.AType =trs_po5.AType and StockTable.Ades = Trs_Po5.Ades   and StockTable.Siz = trs_po5.Siz and StockTable.ColID = trs_po5.Clr and trs_po5.StyleNo = b.StyleNo and trs_po5.OrdID = b.ordid  Where B.Ordid=@OrdID and (B.Invid is null or B.InvID=0) and StockTable.YF='A' And A.GrnType Not In ('Acc.Proc.Return','Acc.Iss.Ret','AccRetToUnit','Acc.Direct') 



 UNION ALL

 Select IsNull(Sum(RecPcs * Pro_Prod_PartwiseRate.JobWrkRate),0) as billvalue,'P' as Flg  from Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.Id = B.Id  LEFT JOIN Trs_PcsGrn3 C ON C.ID = A.ID 
 
 INNER JOIN OrderMas ON A.OrdJob = OrderMas.OrdID  INNER JOIN Mas_Party ON A.Party = Mas_Party.PID  INNER 


JOIN Mas_Color ON B.ColId = Mas_Color.ColID   INNER JOIN Mas_JobWrkComp on C.StageId=Mas_JobWrkComp.Id   INNER JOIN Mas_Dept ON Mas_JobWrkComp.DeptId = Mas_Dept.DeptID   LEFT OUTER JOIN Mas_Panel ON B.PanelID = Mas_Panel.PanelID INNER JOIN Mas_Exporter ON OrderMas.ExpID = Mas_Exporter.ExpID  LEFT OUTER JOIN Pro_Prod_PartwiseRate on  A.ordjob=Pro_Prod_PartwiseRate.ordid and  C.StageID= Pro_Prod_PartwiseRate.WrkID and B.styleno=Pro_Prod_PartwiseRate.styleno  and   B.PartId=Pro_Prod_PartwiseRate.


PartId   Where A.OrdJob=@OrdId and (A.Invid is null or A.InvID=0) and A.GrnType not in ('Process Return') and A.ReceiptType='Piece' 

 UNION  ALL

   Select IsNull(Sum((C.ProdPcs - isnull(C.BilledPcs,0)) * Pro_Prod_PartwiseRate.Rate  ),0) as billvalue,'P' as Flg from Pro_Prod_PartwiseRate inner join Trs_ProdBillEntry C on c.Ordid=Pro_Prod_PartwiseRate.OrdId and Pro_Prod_PartwiseRate.StyleNo=c.StyleNo and Pro_Prod_PartwiseRate.WrkID = C.StageID and Pro_Prod_PartwiseRate.PartID = C.Partid inner join Mas_Emp ON C.empid = Mas_Emp.id  Where Shift_Pcs ='P' and c.OrdId=@OrdID and ( isNull((C.ProdPcs -isnull(C.BilledPcs,0)),0) >0) 

   UNION ALL  

   

   Select IsNull(Sum(RecPcs * Pro_Prod_PartwiseRate.JobWrkRate),0) as billvalue ,'P' as Flg from Trs_PcsGrn1 A INNER JOIN Trs_PcsGrn2 B ON A.Id = B.Id  INNER JOIN OrderMas ON A.OrdJob = OrderMas.OrdID  INNER JOIN Mas_Party ON A.Party = Mas_Party.PID



  INNER JOIN Mas_Color ON B.ColId = Mas_Color.ColID   INNER JOIN Mas_JobWrkComp on A.TargetstageId=Mas_JobWrkComp.Id   INNER JOIN Mas_Dept ON Mas_JobWrkComp.DeptId = Mas_Dept.DeptID   LEFT OUTER JOIN Mas_Panel ON B.PanelID = Mas_Panel.PanelID INNER JOIN Mas_Exporter ON OrderMas.ExpID = Mas_Exporter.ExpID  LEFT OUTER JOIN Pro_Prod_PartwiseRate on  A.ordjob=Pro_Prod_PartwiseRate.ordid and  A.TargetStageID= Pro_Prod_PartwiseRate.WrkID and B.styleno=Pro_Prod_PartwiseRate.styleno and   B.PartId=Pro_Prod_PartwiseRate.PartId   Where A.OrdJob=@OrdID and (A.Invid is null or A.InvID=0) and A.GrnType not in ('Process Return') and A.ReceiptType='Panel'  



 UNION ALL 

 select IsNull(Sum(RecKgs * Trs_HotProcessRate.ProcessRate),0) as billvalue,'F' as Flg from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID left outer join Trs_HotProcessRate on Trs_HotProcessRate.Ordid=b.ordid and Trs_HotProcessRate.DeptID=a.Dept  left outer join Mas_Dept on Mas_Dept.DeptID=Trs_HotProcessRate.DeptID  Where b.Ordid=@OrdID and (b.Invid is null or b.InvID=0) and  (mas_dept.Un_Planned_Process='Y')  and Fab_Pcs_Dept ='F'

  UNION ALL 

  

  select IsNull(Sum(RecKgs * Trs_HotProcessRate.ProcessRate),0) as billvalue,'P' as Flg from Trs_Grn1 A INNER JOIN Trs_Grn2 B ON A.ID = B.ID INNER JOIN StockTable ON B.StockID = StockTable.StockID left outer join Trs_HotProcessRate on Trs_HotProcessRate.Ordid=b.ordid and Trs_HotProcessRate.DeptID=a.Dept  left outer join Mas_Dept on Mas_Dept.DeptID=Trs_HotProcessRate.DeptID  Where b.Ordid=@OrdID and (b.Invid is null or b.InvID=0) and  (mas_dept.Un_Planned_Process='Y')  and Fab_Pcs_Dept ='P'

 

 )X 
