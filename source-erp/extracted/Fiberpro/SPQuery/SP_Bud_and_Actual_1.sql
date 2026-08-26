/*    
;=============================================    
; Author           :  Global Software's  
; Create date      :  08/11/2013 
; Create By        :  Radhakrishnan.R 
; Description      :  Budget Vs Actual  (or) Over All Consolidation  
; Change Person    :  ASLAM
; Last Change Date :  25/08/2023 12.35 PM
; =============================================     
--DBUpdation     
 Alter table Temp_BudgetAndActual add GUID nvarchar(256) null    
 Alter table Temp_BudgetAndActualAbs add GUID nvarchar(256) null    
 Alter VIEW Vue_BudVsAct_Consolid AS SELECT GUID,OrdId, IndexNo, DispName, SUM(BudgetAmt) AS BudgetAmt, SUM(ActualAmt) AS ActualAmt      
 FROM Temp_BudgetAndActual      GROUP BY OrdId, IndexNo, DispName,Guid    
 Create VIEW Vue_BudVsAct AS SELECT GUID,Slno,OrdId, StageID,DeptID,IndexNo, Description as DispName, Type,SUM(BudgetQty) as BudgetQty, SUM(BudgetAmt) AS BudgetAmt,SUM(ActualQty) as ActualQty, SUM(ActualAmt) AS ActualAmt       FROM  Temp_BudgetAndActual  
  GROUP BY OrdId, IndexNo, Description,Guid,StageID,DeptID,Slno,Type    
drop procedure SP_Bud_and_Actual    
exec SP_Bud_and_Actual '72','155,846'    
--select * from Temp_BudgetAndActual where DispName ='Fabric' and OrdId = 155    
select * from Temp_BudgetAndActual    
--Sutract Tran Out qty and add ordid link in Trans In/Out- dharani on 21-Dec-2013  
*/    

Create PROCEDURE SP_Bud_and_Actual_1(@gblcode int,@Guid nvarchar(256),@ORDID nvarchar(4000),@Reqd_TaxInPL char(1),@GPAY char(3) ='YES') as  
BEGIN--B0    
SET NOCOUNT ON     
SET ANSI_NULLS ON    
SET QUOTED_IDENTIFIER ON    
declare @Sno int, @MaxSno int, @OrdQty int
declare @partial char(2)    
--@ORDID int    
delete from Temp_BudgetAndActual where Guid=@Guid    
delete from Temp_BudgetAndActualAbs where Guid=@Guid    

/*Add Budget Yarn*/    

insert into Temp_BudgetAndActual     
(Guid, slno, ordid,deptid,budgetqty,budgetamt)    
select     @Guid, 1,  yarn1.ordid, yarn1.deptid,     
 Case When IsNull(masd.Manual_BudgetKGs_Entry,'N') ='Y'  Then sum(IsNull(yarn2.Qty,0)) Else sum(yarn1.reqkgs) End as Budgetqty,    
 Case When IsNull(masd.Manual_BudgetKGs_Entry,'N') = 'Y' Then sum(IsNull(yarn2.Qty,0)*(isnull(yarn2.rate,0) /*+ isnull(yarn2.Addrate,0)*/))       
Else sum(yarn1.reqkgs*(isnull(yarn2.rate,0)/* + isnull(yarn2.Addrate,0) */ )) End as budgetamt     
from  pro_reqyarn yarn1 (nolock)    
inner join pro_reqyarn2 yarn2 (nolock)     
on yarn1.ordid  = yarn2.ordid       
and yarn1.deptid = yarn2.deptid       
 and yarn1.Colid  = yarn2.Colid       
AND yarn1.CountId = yarn2.CountId     
 INNER JOIN Mas_Dept  masd  (nolock)    
 ON yarn1.DeptID = masd.DeptID     
 And yarn2.DeptID = masd.DeptID     
 where yarn1.ordid  in (select id from fnSplitter(@ORDID))    
GROUP BY yarn1.ordid,yarn1.deptid,isNull(masd.Manual_BudgetKGs_Entry,'N')    

 /*Add Budget Fabric*/    

 insert into Temp_BudgetAndActual      (Guid ,slno ,ordid  ,deptid  ,budgetqty  ,budgetamt)    
SELECT      
@Guid ,1  ,Kn.OrdId ,Kn.DeptId ,     
SUM((CASE WHEN U2.UOM = 'KGS' THEN Kn.ReqKgs ELSE Kn.ReqMtr END)) ,    
SUM((CASE WHEN U2.UOM = 'KGS' THEN Kn.ReqKgs ELSE Kn.ReqMtr END) * (ISNULL(Kn2.Rate, 0)  /* + ISNULL(Kn2.AddRate, 0)*/))      
FROM   Pro_ReqKnitt Kn  (nolock)    
 INNER JOIN  Pro_ReqKnitt2 Kn2 (nolock)    
 ON  Kn.OrdId = Kn2.OrdId  AND  Kn.DeptId  = Kn2.DeptId AND  Kn.FabId = Kn2.FabId     
AND Kn.ColId = Kn2.ColId  AND  Kn.CntID  = Kn2.CntID  AND  Kn.GSM  = Kn2.GSM AND  Kn.DesignId  = Kn2.DesignId     
AND Kn.GG  = Kn2.GG   AND  Kn.LL   = Kn2.LL  AND  Kn.DiaID = Kn2.DiaID     
INNER JOIN  Mas_Uom U1   (nolock)       
 INNER JOIN  Mas_Fabric MF  (nolock) ON  U1.UomID  = MF.PriUomID     
ON MF.FabID = Kn2.FabId    And  Kn.FinDiaID  = Kn2.FinDiaID     
LEFT OUTER JOIN Mas_UOM  U2   (nolock) ON  Kn2.RateUOM  = U2.UOMID     
WHERE Kn.OrdId IN (select id from fnSplitter(@ORDID))     
GROUP BY Kn.OrdId, Kn.DeptId    

 /*Add Budget Accessories*/    

 insert into Temp_BudgetAndActual  (Guid,slno ,ordid,deptid ,budgetqty,budgetamt) 
SELECT @Guid,1  ,AR.OrdID ,16  ,SUM(AR.ReqdQty) ,SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) /* + ISNULL(ABR.AddRate, 0)*/ ))  FROM  PRO_AccReq AR  (nolock)
INNER JOIN Pro_AccBudRate ABR (nolock)    
ON   AR.OrdID  = ABR.OrdID     
AND   AR.Acc_Type  = ABR.Acc_Type  AND AR.Acc_Desc = ABR.Acc_Desc          
AND   AR.Clr   = ABR.Clr       AND AR.Siz  = ABR.Siz  AND AR.PrsId  = ABR.PrsId    
INNER JOIN OrderMas ON AR.Ordid = OrderMas.Ordid 
WHERE AR.ordid in(select id from fnSplitter(@ORDID)) And PurchaseType='Purchase'   
group by AR.ordid

--Nasima 
--Union
--SELECT @Guid,1  ,AR.OrdID ,17  ,SUM(AR.ReqdQty) ,
--SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) + ISNULL(ABR.AddRate, 0)))    
--FROM  PRO_AccReq AR  (nolock)    
--INNER JOIN Pro_AccBudRate ABR (nolock) ON   AR.OrdID  = ABR.OrdID     
--AND   AR.Acc_Type  = ABR.Acc_Type  AND AR.Acc_Desc = ABR.Acc_Desc         
--AND   AR.Clr   = ABR.Clr       AND AR.Siz  = ABR.Siz  AND AR.PrsId  = ABR.PrsId    
--INNER JOIN OrderMas ON AR.Ordid = OrderMas.Ordid 
--WHERE AR.ordid in(select id from fnSplitter(@ORDID))  And AR.ItemType='S' And PurchaseType='Process'  
--group by AR.ordid
 Union
SELECT @Guid,1  ,AR.OrdID ,AR.PrsID  ,SUM(AR.ReqdQty) ,
SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) /* + ISNULL(ABR.AddRate, 0) */ ))    
FROM  PRO_AccReq AR  (nolock)    
INNER JOIN Pro_AccBudRate ABR (nolock)    
ON   AR.OrdID  = ABR.OrdID     
AND   AR.Acc_Type  = ABR.Acc_Type  AND AR.Acc_Desc = ABR.Acc_Desc          
AND   AR.Clr   = ABR.Clr       AND AR.Siz  = ABR.Siz  AND AR.PrsId  = ABR.PrsId    
 INNER JOIN OrderMas ON AR.Ordid = OrderMas.Ordid 
INNER JOIN Mas_Dept ON Mas_dEpt.DeptID=Ar.PrsID
WHERE AR.ordid in(select id from fnSplitter(@ORDID))  And AR.ItemType='S' And PurchaseType='Process'  and Mas_Dept.AccProsDept='Y'  group by AR.ordid,Ar.PrsID

/*Other than Requirment and Budgetting Department Arrival*/    

insert into Temp_BudgetAndActual     
(Guid, slno,ordid,deptid ,budgetqty ,budgetamt)    
Select DISTINCT @Guid, 1 ,OrdID,Prs_Dept ,0   ,0 from Trs_Del1 (nolock)    
INNER JOIN Trs_Del2 (nolock) ON Trs_Del1.ID = Trs_Del2.ID  And Prs_DEpt <>16 and Trs_Del2.Ordid IN (select id from fnSplitter(@ORDID))     
Where Prs_dept    not in (  Select distinct DeptId From Pro_ReqYarn (nolock) Where OrdID IN(select id from fnSplitter(@ORDID))     
UNION     Select distinct DeptId From Pro_ReqKnitt (nolock) Where OrdID in(select id from fnSplitter(@ORDID)) 

 --'Following Condition Added By Nasima 
UNION Select Distinct  Prsid From PRO_AccReq INNER JOIN Temp_BudgetAndActual ON Temp_BudgetAndActual.DeptId=PRO_AccReq.PrsID and
Temp_BudgetAndActual.OrdId=PRO_AccReq.OrdID Where  GUID=@Guid and Temp_BudgetAndActual.OrdId  In (select id from fnSplitter(@ORDID)) )    

/*Add Budget PcsProcess*/    

insert into Temp_BudgetAndActual     
(Guid,slno ,ordid  ,deptid  ,budgetqty,  budgetamt)    
select @Guid,2  ,PP.ordid ,PP.prodpros,IsNull(Sum(IsNull(PP.Qty,0)),0),(isnull(PP.rate,0) /*  + isnull(PP.Addrate,0)*/ )* IsNull(Sum(IsNull(PP.Qty,0)),0) 
From Pro_ProdPros PP (nolock) INNER JOIN ORderMas ON PP.OrdId = OrderMas.Ordid 
Where PP.ordid in(select id from fnSplitter(@ORDID)) and PP.rate>0      
group by PP.ordid,PP.prodpros,PP.rate,PP.Addrate

/* cutPlanQty Column Added - SemiFinished*/    
/* Not Bit*/
insert into Temp_BudgetAndActual     
(Guid,slno ,ordid, deptid,budgetqty  ,budgetamt, ActualQty,ActualAmt     ,StageID)    
Select @Guid,3  ,Ordid, Deptid,Sum(budgetqty) ,Sum(OrderQty * Rate) ,    
case when (Sum(budgetqty)*ActualRate)>0 then Sum(budgetqty) else 0 end ,Sum(budgetqty)*ActualRate , StageID    
From (
select distinct PE.ordid,MD.deptid,PE.styleno,case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(QD.OrderQty),0)  Else 
IsNull(Sum(QD.CutPlanQty),0)  End orderQty,  Case When IsNull(Avg(PR1.Rate_Pcs),0)>0 Then IsNull(Avg(PR1.Rate_Pcs),0) Else IsNull(Avg(PR1.JobWrkRate),0) End As Rate,ActualRate,PE.wrkid as StageID,case when isNull(Allow_Excess_InBudget,'N') ='N' then Sum(QD.OrderQty) Else Sum(QD.CutPlanQty) End as budgetqty    from Trs_ProdExp  PE  (nolock)    Inner Join  OrderQtyDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID AND QD.PartID = PR.PartID  LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID  and Qd.ColID = PR1.ClrID left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id     left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid     left outer join options on 1 =1 where PE.ordid in(select id from fnSplitter(@ORDID)) and MD.SEMIFINISH ='S'  and JW.PcsType <> 'Bit'   group by PE.ordid, MD.deptid, ActualRate, PE.wrkid, PE.styleno, isnull(PR1.Rate_Pcs,0),isnull(PE.addrate,0) ,isnull(PR1.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N')   

) A Group by ordid, deptid, actualrate, StageID    

/* Chandru */ 

insert into Temp_BudgetAndActual     
(Guid,slno ,ordid, deptid,budgetqty  ,budgetamt, ActualQty,ActualAmt     ,StageID)    
Select @Guid,3  ,Ordid, Deptid,Sum(budgetqty) ,Sum(OrderQty * Rate) ,    
case when (Sum(budgetqty)*ActualRate)>0 then Sum(budgetqty) else 0 end ,Sum(budgetqty)*ActualRate , StageID    
From (

select distinct PE.ordid,MD.deptid,PE.styleno,case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(QD.OrderQty/isnull(noofpcsperbit,0)),0)  Else 
IsNull(Sum(QD.CutPlanQty/isnull(noofpcsperbit,0)),0)  End orderQty,  Case When IsNull(Avg(PR1.Rate_Pcs),0)>0 Then IsNull(Avg(PR1.Rate_Pcs),0) Else IsNull(Avg(PR1.JobWrkRate),0) End As Rate,ActualRate,PE.wrkid as StageID,case when isNull(Allow_Excess_InBudget,'N') ='N' then Sum(QD.OrderQty/isnull(noofpcsperbit,0)) Else Sum(QD.CutPlanQty/isnull(noofpcsperbit,0)) End as budgetqty    from Trs_ProdExp  PE  (nolock)    Inner Join  OrderQtyDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID AND QD.PartID = PR.PartID  LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID  and Qd.ColID = PR1.ClrID left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id     left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid     left outer join options on 1 =1 where PE.ordid in(select id from fnSplitter(@ORDID)) and MD.SEMIFINISH ='S'  and JW.PcsType = 'Bit'  and   ISNULL(MD.ProcBill,'') <> 'K'  group by PE.ordid, MD.deptid, ActualRate, PE.wrkid, PE.styleno, isnull(PR1.Rate_Pcs,0),isnull(PE.addrate,0) ,isnull(PR1.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N')   
union all
select distinct PE.ordid,MD.deptid,PE.styleno,case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Pro_Prod_Budget_Det.Kgs,0)  Else 
IsNull(Pro_Prod_Budget_Det.Kgs,0)  End orderQty,  Case When IsNull(Avg(PR1.Rate_Pcs),0)>0 Then IsNull(Avg(PR1.Rate_Pcs),0) Else IsNull(Avg(PR1.JobWrkRate),0) End As Rate,ActualRate,PE.wrkid as StageID,case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Pro_Prod_Budget_Det.Kgs,0)  Else IsNull(Pro_Prod_Budget_Det.Kgs,0)  End as budgetqty    from Trs_ProdExp  PE  (nolock)    Inner Join  OrderQtyDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID AND QD.PartID = PR.PartID  LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID  and Qd.ColID = PR1.ClrID left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id   left outer join Pro_Prod_Budget_Det on Pro_Prod_Budget_Det.ordid = PE.OrdId  left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid     left outer join options on 1 =1 where PE.ordid in(select id from fnSplitter(@ORDID)) and MD.SEMIFINISH ='S'  and JW.PcsType = 'Bit' and    ISNULL(MD.ProcBill,'') = 'K'   group by PE.ordid, MD.deptid, ActualRate, PE.wrkid, PE.styleno, isnull(PR1.Rate_Pcs,0),isnull(PE.addrate,0) ,isnull(PR1.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N') ,IsNull(Pro_Prod_Budget_Det.Kgs,0) 

) A Group by ordid, deptid, actualrate, StageID   

/* cutPlanQty Column Added - Finished*/    

insert into Temp_BudgetAndActual     
(Guid,slno ,ordid, deptid,budgetqty  ,budgetamt, ActualQty,ActualAmt     ,StageID)    
Select @Guid,3  ,Ordid, Deptid,Sum(budgetqty) ,Sum(OrderQty * Rate) ,    
case when (Sum(budgetqty)*ActualRate)>0 then Sum(budgetqty) else 0 end ,Sum(budgetqty)*ActualRate , StageID     
From (
select distinct PE.ordid,MD.deptid,PE.styleno,
case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(QD.SizeQty),0) Else
IsNull(Sum(CEILING((QD.SizeQty)+ (QD.SizeQty * QD.Exs_Per /100))),0) End  orderQty, Case When (isnull(PE.rate,0))>0 Then (isnull(PE.rate,0)+isnull(PE.addrate,0)) Else (isnull(PE.JobWrkRate,0)  +isnull(PE.addrate,
0) )
End as  Rate,ActualRate,PE.wrkid as StageID, case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(QD.SizeQty),0) Else Sum(CEILING((QD.SizeQty)+ (QD.SizeQty * QD.Exs_Per /100))) End as budgetqty    
from   Trs_ProdExp  PE  (nolock)    
Inner Join  OrdQtyClrDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo 
left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id     
left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid    
left outer join options on 1 = 1
where PE.ordid in(select id from fnSplitter(@ORDID)) and MD.SEMIFINISH ='F'       
group by PE.ordid, MD.deptid, ActualRate, PE.wrkid, PE.styleno, isnull(PE.rate,0),isnull(PE.addrate,0) ,isnull(PE.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N')   
) A Group by ordid, deptid, actualrate, StageID 

/* Additional Stages not in budget */

 select stageid from Temp_BudgetAndActual
insert into Temp_BudgetAndActual     
(Guid,slno ,ordid, deptid,budgetqty,budgetamt,ActualQty,ActualAmt,StageID)    
Select @Guid,3  ,Ordid, Deptid,0 ,0 , 0 ,0, StageID     
From (    
select distinct PE.ordid,MD.deptid,PE.styleno,     
IsNull(Sum(QD.CutPlanQty),0)  orderQty, 0 as  Rate,0 as ActualRate,PE.StageID as StageID,Sum(QD.CutPlanQty) as budgetqty    
From   Trs_ProdEntry PE  (nolock)    
Inner Join  OrderQtyDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo     
left outer join mas_jobwrkcomp JW  (nolock)  on PE.StageID  = JW.id     
left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid     
where PE.ordid in(select id from fnSplitter(@ORDID)) and PE.StageID not in ( Select Distinct StageID from Temp_BudgetAndActual (nolock) where Stageid is not null and Guid=@Guid     )
group by PE.ordid, MD.deptid,  PE.StageID, PE.styleno   
) A Group by ordid, deptid,  StageID    

/*Inhouse - PRODUCTION */    

select @partial=isnull(ProdbillEntryPartial,'N') from Options
if @partial='Y'
begin
;with cte(slno,ordid,deptid, actqty, actamt,stid) as
(select 3,x.ordid,x.deptid,sum(x.qty),sum(x.amt) ,x.StageID from (
select TPDN.ordid,MD.DeptID,isnull(TPDN.ThisBillQty,0) as qty,isnull((TPDN.ThisBillQty * TPDN.Rate),0) as amt ,TPDN.StageID,TPDN.StyleNo,IsNull(Colorid,0) as Colorid  
 from Trs_ProdBillDetNew TPDN 
inner join Mas_JobWrkComp MJW on MJW.Id=TPDN.StageID
inner join Mas_Dept MD on MD.DeptID=MJW.DeptId
where TPDN.OrdId in(select id from fnSplitter(@ORDID))
/*group by MD.DeptID,TPDN.ordid,TPDN.StageID,TPDN.StyleNo,TPDN.ThisBillQty,TPDN.Rate,IsNull(Colorid,0) */
union all
SELECT  TPQ.OrdId,MD.DeptID,   TPQ.Mtr AS Qty  ,
Case When /*(Select Isnull(Reqd_TaxInPL,'Y') From Options)*/@Reqd_TaxInPL='Y' Then isNull(TPQ.NetAmount,0) ELSE 
isnull((TPQ.Mtr*TPQ.Rate ),0) END as amt,TPE.WrkId As StageID, TPQ.StyleNo,0 as Colorid From Trs_ProdExp TPE Inner JOIN   Mas_JobWrkComp   MJW  (nolock) ON TPE.WrkId=MJW.Id
Inner JOIN   Mas_Dept   MD  (nolock) ON MJW.DeptId=MD.DeptId Inner Join Trs_BillRate  TPQ On TPE.OrdId=TPQ.OrdID And TPQ.StyleNo = TPE.StyleNo And TPE.WrkID=TPQ.Dept
WHERE  (TPQ.OrdId in (select id from fnSplitter(@ORDID)) And MD.OutputType='P')
)x 
 where x.Ordid in(select id from fnSplitter(@ORDID)) 
group by x.StageID,x.DeptID,x.Ordid
)
update tmp    
set  ActualQty  = isnull(ActualQty,0) +ActQty,    
ActualAmt  = isnull(ActualAmt,0) + ActAmt    
From Temp_BudgetAndActual tmp     join cte     
 on  tmp.ordid  = cte.ordid    
and  tmp.Deptid  = cte.Deptid    
and  tmp.StageID  = cte.StID    
 and  tmp.Slno  = cte.Slno    
where tmp.guid  = @Guid    
end 
else
begin
;with   cte(Slno,ordid,DeptID,ActQty    ,ActAmt      ,StID) as 
(Select 3,Ordid,Deptid,Isnull(Sum (Qty),0) ,Isnull(Sum (Qty * Rate),0) ,StageID--, Isnull(Avg(Rate),0) as  AvgRate 
From (  SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,  case Isnull(TP.Rate,0) when 0 then (    
case Isnull(BPD.Rate,0) when 0 then  TPE.Rate+ ActualRate 
else Isnull(BPD.Rate,0) end   )   
else TP.Rate end As Rate , TPQ.ProdPcs AS Qty  
FROM    Mas_Dept    MD  (nolock)  
RIGHT OUTER JOIN BudPodet    BPD  (nolock)   
INNER JOIN   BudPoMas    BPM  (nolock) ON BPD.Id  = BPM.Id
RIGHT OUTER JOIN Trs_ProdentryQty  TPQ  (nolock)
INNER JOIN   Trs_Prodentry   TP  (nolock) ON TPQ.id  = TP.id 
INNER JOIN   Mas_JobWrkComp   MJW  (nolock) ON TP.StageID = MJW.Id  ON BPD.Size = TPQ.SizId
AND     BPD.ColId    =  TP.ClrId AND BPD.PartId = TP.PartId AND BPM.DeptId = TP.StageID 
AND     BPM.OrdId    =  TP.OrdId AND BPD.StyleNo = TP.StyleNo ON  MD.DeptID = MJW.DeptId  
LEFT OUTER JOIN  Trs_ProdExp    TPE ( nolock)  ON TP.StyleNo = TPE.StyleNo AND TP.StageID = TPE.WrkID 
AND     TP.OrdId    =  TPE.OrdId
LEFT OUTER JOIN  Pro_Prod_PartwiseRate PPPR (nolock) ON TPE.OrdId = PPPR.OrdID AND TPE.StyleNo = PPPR.StyleNo 
AND     TPE.WrkId    =  PPPR.WrkID AND TP.PartId = PPPR.PartID  
LEFT OUTER JOIN  Bud_InhRateclw PPPR1 (nolock) ON TPE.OrdId = PPPR1.OrdID AND TPE.StyleNo = PPPR1.StyleNo 
AND     TPE.WrkId    =  PPPR1.NWork AND TP.PartId = PPPR1.PartID  and tpq.SizId = PPPR1.SizeId
WHERE  (TP.ReWork=0 and TP.OrdId in(select id from fnSplitter(@ORDID)))
or (RateType_Prs_REWORK = 'P' and TP.OrdId in(select id from fnSplitter(@ORDID))) 
Union All
SELECT MD.DeptID, TPQ.OrdId, TPE.WrkId As StageID, TPQ.StyleNo,    
case Isnull(TPQ.Rate,0) when 0 then (    
case Isnull(TPE.Rate,0) when 0 then Isnull(TPE.Rate,0) end   )     
else TPQ.Rate end As Rate , TPQ.Mtr AS Qty     
From Trs_ProdExp TPE
Inner JOIN   Mas_JobWrkComp   MJW  (nolock) ON TPE.WrkId=MJW.Id
Inner JOIN   Mas_Dept   MD  (nolock) ON MJW.DeptId=MD.DeptId
Inner Join Trs_BillRate  TPQ On TPE.OrdId=TPQ.OrdID And TPQ.StyleNo = TPE.StyleNo And TPE.WrkID=TPQ.Dept
WHERE  (TPQ.OrdId in (select id from fnSplitter(@ORDID)) And MD.OutputType='P')
-- )as A     
 --Group by Ordid, Deptid ,StageID     
 /* )    
update tmp    
set  ActualQty  = ActQty,    
ActualAmt  = ActAmt    
From Temp_BudgetAndActual tmp     
join cte     
on  tmp.ordid  = cte.ordid    
and  tmp.Deptid  = cte.Deptid    
 and  tmp.StageID  = cte.StID    
and  tmp.Slno  = cte.Slno    
where tmp.guid  = @Guid     
 ;with   cte(Guid,Slno ,ordid,DeptID ,ActQty    ,ActAmt      ,StID) as      
(    */
Union all

--Select    @Guid,4  ,Ordid,Deptid ,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate    
--Select   4  ,Ordid,Deptid ,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate 
--  From (    
SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,Isnull(BPD.Rate,0) Rate ,     
 TPQ.ProdPcs AS Qty     
FROM    Mas_Dept    MD  (nolock)    
RIGHT OUTER JOIN BudPodet    BPD  (nolock)    
INNER JOIN   BudPoMas    BPM  (nolock) ON BPD.Id  = BPM.Id     
 RIGHT OUTER JOIN Trs_ProdentryQty  TPQ  (nolock)    
INNER JOIN   Trs_Prodentry   TP  (nolock) ON TPQ.id  = TP.id     
INNER JOIN   Mas_JobWrkComp   MJW  (nolock) ON TP.StageID = MJW.Id  ON  BPD.Size = TPQ.SizId     
AND     BPD.ColId    =  TP.ClrId AND BPD.PartId = TP.PartId  AND  BPM.DeptId = TP.StageID     
AND     BPM.OrdId    =  TP.OrdId AND BPD.StyleNo = TP.StyleNo ON  MD.DeptID = MJW.DeptId     
LEFT OUTER JOIN  Trs_ProdExp  TPE  (nolock) ON TP.StyleNo = TPE.StyleNo AND  TP.StageID = TPE.WrkID     
AND     TP.OrdId    =  TPE.OrdId      
 LEFT OUTER JOIN  Pro_Prod_PartwiseRate PPPR (nolock) ON TPE.OrdId = PPPR.OrdID AND  TPE.StyleNo = PPPR.StyleNo     
AND     TPE.WrkId    =  PPPR.WrkID AND TP.PartId = PPPR.PartID     
 LEFT OUTER JOIN  Bud_InhRateclw PPPR1 (nolock) ON TPE.OrdId = PPPR1.OrdID AND  TPE.StyleNo = PPPR1.StyleNo     
AND     TPE.WrkId    =  PPPR1.NWork AND TP.PartId = PPPR1.PartID     and tpq.SizId = PPPR1.SizeId
WHERE (TP.ReWork  = 1  And TP.OrdId  in(select id from fnSplitter(@ORDID)) )    
 or (    BPM.RateType_Prs_REWORK = 'R' And TP.OrdId  in(select id from fnSplitter(@ORDID)))    
 )as A     
Group by Ordid, Deptid ,StageID       
) 
update tmp    
set  ActualQty  = isnull(ActualQty,0) +ActQty,    
ActualAmt  = isnull(ActualAmt,0) + ActAmt    
From Temp_BudgetAndActual tmp     join cte     
 on  tmp.ordid  = cte.ordid    
and  tmp.Deptid  = cte.Deptid    
and  tmp.StageID  = cte.StID    
and  tmp.Slno  = cte.Slno    
where tmp.guid  = @Guid     

/*  ;with   cte(Guid,Slno ,ordid,DeptID ,ActQty    ,ActAmt      ,StID) as      
(     Select    @Guid,4  ,Ordid,Deptid ,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate    
From (    
SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,Isnull(BPD.Rate,0) Rate ,     
TPQ.ProdPcs AS Qty     
FROM    Mas_Dept    MD  (nolock)    
RIGHT OUTER JOIN BudPodet    BPD  (nolock)    
INNER JOIN   BudPoMas    BPM  (nolock) ON BPD.Id  = BPM.Id     
RIGHT OUTER JOIN Trs_ProdentryQty  TPQ  (nolock)    
INNER JOIN   Trs_Prodentry   TP  (nolock) ON TPQ.id  = TP.id     
INNER JOIN   Mas_JobWrkComp   MJW  (nolock) ON TP.StageID = MJW.Id  ON  BPD.Size = TPQ.SizId     
 AND     BPD.ColId    =  TP.ClrId AND BPD.PartId = TP.PartId  AND  BPM.DeptId = TP.StageID     
AND     BPM.OrdId    =  TP.OrdId AND BPD.StyleNo = TP.StyleNo ON  MD.DeptID = MJW.DeptId     
LEFT OUTER JOIN  Trs_ProdExp    TPE  (nolock) ON TP.StyleNo = TPE.StyleNo AND  TP.StageID = TPE.WrkID     
AND     TP.OrdId    =  TPE.OrdId      
LEFT OUTER JOIN  Pro_Prod_PartwiseRate PPPR (nolock) ON TPE.OrdId = PPPR.OrdID AND  TPE.StyleNo = PPPR.StyleNo     
AND     TPE.WrkId    =  PPPR.WrkID AND TP.PartId = PPPR.PartID     
WHERE (TP.ReWork  = 1   And TP.OrdId  in(select id from fnSplitter(@ORDID)))    
or  (BPM.RateType_Prs_REWORK = 'R' And TP.OrdId  in(select id from fnSplitter(@ORDID)))    
)as A     
Group by Ordid, Deptid ,StageID       
) */   
--insert into Temp_BudgetAndActual(    
--  Guid,slno  ,ordid  ,DeptID  ,budgetqty ,budgetamt ,ActualQty ,ActualAmt ,StageID )    
 --select @Guid,cte.Slno ,cte.ordid ,cte.Deptid ,0   ,0   ,cte.ActQty ,cte.ActAmt ,cte.StID    --from  cte    
--  Left OUTER JOIN Temp_BudgetAndActual tmp  
--  on  cte.ordid  = tmp.ordid    
 --  and  cte.Deptid  = tmp.Deptid    
 --and  cte.StID  = tmp.StageID    
 --and  cte.Slno  = tmp.Slno    
 --  where   tmp.DeptId IS NULL    
end 

/* 'For Commerical */    
 insert into Temp_BudgetAndActual(    
Guid, slno,  ordid,     budgetqty, budgetamt,  ActualQty, ActualAmt,    
Type,          Description)    
 SELECT        @Guid, 5, BC.OrdID, null,  null,    null,  null,     ISNULL(MC.Type, '-') AS Type, MC.Descr    
FROM  PRo_BudCommercial BC (nolock)    
INNER JOIN Mas_Commercial  MC (nolock)    
ON   BC.ComID =  MC.ID      
and   BC.OrdID in     (select id from fnSplitter(@ORDID))    
;with   cte(ordid,budqty,budamt,comdesc) as      
(    
SELECT     BC.OrdID,
Isnull(sum( QD.CutPlanQty),0) AS budgetqty,    
--case  rtrim(MC.Pers_PerPcs)     
--when '%' then isnull(sum(QD.orderqty),0)*BC.Val    
 --when 'P' then ISNULL(Sum(QD.OrderQty * SaleRate * isnull(OM.Crate,0)),0)/100 * BC.Per    
 --else BC.Total     
--end      
 Isnull(BC.total,0) AS budgetamt,MC.Descr     
FROM   PRo_BudCommercial BC (nolock)    
INNER JOIN  Mas_Commercial MC  (nolock) ON BC.ComID = MC.ID  and BC.OrdID in (select id from fnSplitter(@ORDID))   
LEFT OUTER JOIN OrderMas OM    (nolock) ON OM.OrdId = BC.OrdID    
LEFT OUTER JOIN OrderQtyDtl QD   (nolock) ON OM.OrdId = QD.OrdID     
where BC.OrdID in(select id from fnSplitter(@ORDID))    
GROUP BY BC.Total,MC.Pers_PerPcs,BC.OrdID, MC.Type, MC.Descr, BC.Per, BC.Val, MC.ID       
)    
update tmp    set  budgetqty  = budqty,    
 budgetamt  = budamt    
From Temp_BudgetAndActual tmp     
 join cte     
on  tmp.ordid  = cte.ordid    
and  tmp.Description = cte.comdesc    
and  tmp.slno   = 5    
where tmp.guid  = @Guid      
;with   cte(ordid,actqty,actamt,comdesc) as      
(Select  c.OrdID,     case when isnull(SUM(b.BillAmount), 0) >0 then   ISNULL(SUM(TP2.Pcs), 0) else 0 end AS ActualQty,     

--Nasima 
  --isnull(SUM(b.BillAmount), 0) AS ActualAmt, /Chandru remove stylewise 
 Case When  IsNull(a.Type,'A')='A' Then  (isnull(SUM(b.BillAmount), 0)/*/(Select Count(Distinct StyleNo) From OrderQtyDtl Where Ordid in (select id from fnSplitter(@ORDID)))*/)   Else (isnull(SUM(b.BillAmount), 0))  End AS ActualAmt,d.Descr AS Description    
from shippingBill a inner join Shippingbill_det b on a.id = b.cid    INNER JOIN PRo_BudCommercial c   
 on c.ComID = b.CommID and b.OrdID = c.OrdID    inner join Mas_Commercial d on d.ID = c.ComID and d.ID = b.CommID   
 LEFT OUTER JOIN Trs_Pcs1 TP1   (nolock) ON c.OrdID = TP1.Ordjobno and TP1.DelType = 'Despatch'    and a.dept = tp1.dept LEFT OUTER JOIN Trs_Pcs2 TP2   (nolock) ON TP1.ID = TP2.ID     
Where  b.OrdID in(select id from fnSplitter(@ORDID)) 
group by c.OrdID,d.Descr,a.Type  
 )    
update tmp     set  ActualQty = actqty ,    ActualAmt = actamt 
From Temp_BudgetAndActual tmp     
join cte     
on  tmp.ordid  = cte.ordid    
and  tmp.Description = cte.comdesc    
INNER JOIN OrderMas OM1 (nolock) ON tmp.Ordid = OM1.Ordid 
and  tmp.slno   = 5    
where tmp.guid  = @Guid      

/* Bills==>Expenses Amount Are Must Be Displayed in Report if is not in Budget commercial*/    
insert into Temp_BudgetAndActual    
(  Guid,slno ,ordid,ActualQty,ActualAmt ,Type,Description ,budgetqty ,budgetamt)    
Select @Guid,5  ,Ordid,0  ,sum(Amount),MC.Type,Descr   ,0   ,0    
from  Trs_Expenses TE (nolock)    
inner join  Mas_commercial MC (nolock) on TE.Expid = MC.id     
where ordid in(select id from fnSplitter(@ORDID)) Group by Ordid,Descr,MC.Type    


/*Add Actual Amount Details    
Instead of Amount -> NetAmount Taken NetAmount=Amount+Tax Cal*/    
 /* Yarn and Fabric Releated Actual Posting */
 ;with   cte(ordid,actqty,actamt,DeptID) as      
(    Select X.OrdId,Sum(X.Qty),Sum(X.NetAmount),X.Dept From (
SELECT   TBR.OrdID, Case When ISNULL((TBR.Mtr), 0)=0 Then ISNULL((TBR.Kgs), 0) Else ISNULL((TBR.Mtr), 0) End As Qty,Case When /*(Select Isnull(Reqd_TaxInPL,'Y') From Options)*/@Reqd_TaxInPL='Y' Then (TBR.NetAmount) Else (TBR.Amount) End As NetAmount,TBR.dept     
 FROM        Trs_Bills    TB (nolock)    
INNER JOIN  Trs_BillRate   TBR (nolock) ON TB.ID = TBR.ID     
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TBR.dept = TDA.DeptID and TBR.OrdID = TDA.OrdId    
INNER JOIN  Mas_Dept  MD  (nolock) ON TBR.dept=MD.Deptid      
WHERE  TBR.OrdID  in (select id from fnSplitter(@ORDID)) and TDA.Slno =1 and tda.guid = @Guid And TB.Type<>'PP'   
 and MD.InputType <>'-' 
 ) X

GROUP BY X.OrdID, X.dept    
)    
update tmp     
set  ActualQty = actqty,    
ActualAmt =actamt     
from Temp_BudgetAndActual tmp    
join cte     
on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID    
INNER JOIN  Mas_Dept  MD  (nolock) ON Cte.deptID=MD.Deptid      
where tmp.guid = @Guid and slno=1    and MD.InputType <>'-' 
/* Accessory Releated Actual Posting */
;with   cte(ordid,actqty,actamt,DeptID) as      
(      SELECT   TBR.OrdID,   ISNULL(SUM(TBR.Kgs), 0) ,
Case When /*(Select Isnull(Reqd_TaxInPL,'Y') From Options)*/@Reqd_TaxInPL='Y' Then Sum(TBR.NetAmount) Else Sum(TBR.Amount) End As NetAmount ,TBR.dept  FROM        Trs_Bills    TB (nolock)    
INNER JOIN  Trs_BillRate   TBR (nolock) ON TB.ID = TBR.ID     
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TBR.dept = TDA.DeptID and TBR.OrdID = TDA.OrdId    
INNER JOIN  Mas_Dept  MD  (nolock) ON TBR.dept=MD.Deptid      
INNER JOIN ORDERMAS ON TBR.ORDID = ORDERMAS.ORDID 	
WHERE  TBR.OrdID  in (select id from fnSplitter(@ORDID)) and TDA.Slno =1 and tda.guid = @Guid 
and MD.InputType ='-' and MD.OutPutType='-'    
GROUP BY TBR.OrdID, TBR.dept     )    
update tmp     
set  ActualQty = actqty,    
ActualAmt =actamt     
from Temp_BudgetAndActual tmp    
join cte     
on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID    
INNER JOIN  Mas_Dept  MD  (nolock) ON cte.deptID=MD.Deptid      
where tmp.guid = @Guid and slno=1    and MD.InputType ='-' and MD.OutPutType='-'    

/* Opening Stock - rk*/    
 ;with   cte(ordid,actqty,actamt,DeptID) as      
 (     select OP.OrdID,Isnull(Sum(kgs),0)  as TotKg , Isnull(SUM(kgs*Rate),0) as totAmt ,Dept     
FROM  Trs_Opening    OP (nolock)    INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON OP.dept = TDA.DeptID     
 where OP.OrdID in (select id from fnSplitter(@ORDID)) AND TDA.Slno =1 and tda.guid = @Guid    
group by OP.OrdID,Dept    
 )    
update tmp     
set  ActualQty = isnull(ActualQty,0) + actqty,    
ActualAmt = isnull(ActualAmt,0) + actamt     
from Temp_BudgetAndActual tmp    
 join cte     
on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID    
where tmp.guid = @Guid and slno=1     

/*Transfer In*/     
 ;with   cte(ordid,actqty,actamt,DeptID) as      
 (     select tranordid,Isnull(Sum(Kg),0) TotKg, Isnull(Sum(Kg*Rate),0) TotAmt,prs_dept     
from  trs_del1    TD1 (nolock)    
inner join trs_del2    TD2 (nolock) on TD1.id = TD2.id     
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TD2.tranordid = TDA.Ordid  and TD1.Prs_Dept = TDA.DeptID     
 where tranordid in (select id from fnSplitter(@ORDID))  AND TDA.Slno =1 and tda.guid = @Guid    group by tranordid,prs_dept    
)    
update tmp     
set  ActualQty = isnull(ActualQty,0) + actqty,    
 ActualAmt = isnull(ActualAmt,0) + actamt     
from Temp_BudgetAndActual tmp    
join cte     
on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID    
where tmp.guid = @Guid and slno=1     

/*Transfer out*/    
;with   cte(ordid,actqty,actamt,DeptID) as      
(    
select TD2.ordid,Isnull(Sum(Kg),0) TotKg, Isnull(Sum(Kg*Rate),0) TotAmt ,prs_dept    
from  trs_del1 TD1 (nolock)    inner join trs_del2 TD2    (nolock) on TD1.id = TD2.id     
 INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TD2.Ordid = TDA.Ordid  and TD1.Prs_Dept = TDA.DeptID      
 where trtype in (3,8) AND TD2.ordid in (select id from fnSplitter(@ORDID))  AND TDA.Slno =1 and tda.guid = @Guid    
group by TD2.ordid,prs_dept    
  )    
 update tmp      set  ActualQty = isnull(ActualQty,0) - actqty,    
ActualAmt = isnull(ActualAmt,0) - actamt     
from Temp_BudgetAndActual tmp    
 join cte     
on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID    
where tmp.guid = @Guid  and slno=1    

 /* For Actual Pcs Forms */    

;with   cte(ordid,actqty,actamt,DeptID) as      
(       SELECT BR.OrdID ,ISNULL(SUM(BR.Mtr), 0) AS ActKgs, SUM(BR.Amount) AS Amount, BR.dept     
FROM  Trs_Bills  TB   (nolock)      INNER JOIN  Trs_BillRate BR   (nolock) ON TB.ID = BR.ID     
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON BR.dept = TDA.DeptID     
WHERE  BR.OrdID in (select id from fnSplitter(@ORDID))  AND TDA.Slno =2 and tda.guid = @Guid    
GROUP BY BR.OrdID ,BR.dept      
)    
update tmp     
set  ActualQty = isnull(ActualQty,0) + actqty,    
ActualAmt = isnull(ActualAmt,0) + actamt     
from Temp_BudgetAndActual tmp    
 join cte     
on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID    
where tmp.guid = @Guid and slno=2    
if @gblcode=123 
 Begin
 update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from   
(select Y.ordid,departmentid as Dept,
IsNull(Sum(Y.ProdPcs),0) as kgs,
Sum(Wages) as netamount from Wages_ProductionMas X INNER JOIN Wages_ProductionDet Y ON X.MasSlno = Y.DetSlno INNER JOIN OrderMas ON Y.Ordid = OrderMas.Ordid 
Group by Y.ordid,departmentID) a    
inner join Temp_BudgetAndActual  b on a.ordid=b.ordid and a.dept=b.deptid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where               b.ordid in (select id from fnSplitter(@ORDID)) and slno=2     and b.guid=@Guid
 End

 /* Production Shift Wages */
   update b set b.actualamt=isnull(b.actualamt,0) + a.netamount from   
(select Y.ordid,StageId ,
Sum(ShiftWages) as netamount from Trs_ProdShiftWages Y INNER JOIN OrderMas ON Y.Ordid = OrderMas.Ordid 
Group by Y.ordid,StageId) a    
inner join Temp_BudgetAndActual  b on a.ordid=b.ordid and a.StageId=b.StageID  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where               b.ordid in (select id from fnSplitter(@ORDID)) and slno=3     and b.guid=@Guid


/* For Dept Act.Bill Amount not in bud. Entry */     
 insert into Temp_BudgetAndActual     (  Guid,slno ,ordid  ,deptid  ,ActualQty     ,ActualAmt)    
SELECT @Guid,1  ,TBR.OrdID ,TBR.dept ,ISNULL(SUM(TBR.Kgs), 0) ,SUM(TBR.Amount)     
FROM        Trs_Bills  TB  (nolock)    
 INNER JOIN Trs_BillRate TBR  (nolock) ON TB.ID = TBR.ID     
inner join Mas_Dept  MD  (nolock) ON TBR.dept=MD.Deptid      
WHERE  TBR.OrdID  in (select id from fnSplitter(@ORDID))     
AND (TBR.dept  not in ( Select Distinct Deptid from Temp_BudgetAndActual (nolock) where Deptid is not null )) And MD.outputtype in('Y','F','-')      GROUP BY TBR.dept,TBR.OrdID    
 insert into Temp_BudgetAndActual  (  Guid,slno,ordid  ,deptid ,ActualQty    ,ActualAmt  )     
SELECT @Guid,2  ,TBR.OrdID ,TBR.dept ,ISNULL(SUM(TBR.Mtr), 0),SUM(TBR.Amount)    
 FROM  Trs_Bills  TB  (nolock)    
 INNER JOIN  Trs_BillRate TBR  (nolock) ON TB.ID  = TBR.ID     
inner join  Mas_Dept  MD  (nolock) ON TBR.dept = MD.Deptid      
 WHERE      TBR.OrdID  in (select id from fnSplitter(@ORDID))      
AND   TBR.dept  not in ( Select Distinct Deptid from Temp_BudgetAndActual (nolock) where Deptid is not null ) And MD.outputtype in('P')     
GROUP BY TBR.dept,TBR.OrdID    


/*For Yarn ANd Fabric Sales and Job Wrk Invoice    
 'For separate yanr & fabric*/    
 ;with   cte(      Guid,Slno,ordid  ,DeptID ,ActQty      ,ActAmt          ) as      
(      SELECT @Guid,1  ,Trs_Del2.OrdID ,Prs_Dept ,isnull(SUM(Trs_Del2.Kg),0) ,isnull(SUM(Trs_Del2.Kg * Trs_Del2.rate),0)     
FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID     
WHERE ISNULL(Trs_Del1.InvId, 0) <> 0 AND Trs_Del2.OrdID in (select id from fnSplitter(@ORDID))      
 Group By Prs_Dept,Trs_Del2.OrdID      )      update tmp    
 set  ActualQty  = isnull(ActualQty,0) - ActQty,    
ActualAmt  = isnull(ActualAmt,0) - ActAmt    
 From Temp_BudgetAndActual tmp     
 join cte      on  tmp.ordid  = cte.ordid    
and  tmp.Deptid  = cte.Deptid    
and  tmp.Slno  = cte.Slno    
where tmp.guid  = @Guid     
 ;with   cte(     Guid,Slno,ordid    ,DeptID ,ActQty      ,ActAmt          ) as      
(      Select  @Guid,2  ,Trs_Pcs1.Ordjobno ,Dept ,ISNULL(SUM(Trs_Pcs2.Pcs),0), ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)    
 FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID     
 WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 AND Trs_Pcs1.Ordjobno  in (select id from fnSplitter(@ORDID))     
 Group by Dept,Trs_Pcs1.Ordjobno    )    
 update tmp    
 set  ActualQty  = isnull(ActualQty,0) - ActQty,    
 ActualAmt  = isnull(ActualAmt,0) - ActAmt    
From Temp_BudgetAndActual tmp     
 join cte     
 on  tmp.ordid  = cte.ordid    
and  tmp.Deptid  = cte.Deptid    
and  tmp.Slno  = cte.Slno    
 where tmp.guid  = @Guid     
Set Nocount off     
end --B0


 