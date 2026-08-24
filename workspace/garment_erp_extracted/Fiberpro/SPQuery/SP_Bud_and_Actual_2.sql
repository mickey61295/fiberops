/*    

;=============================================    

; Author           :  Global Software's  

; Create date      :  10/02/2026 

; Create By        :  ASLAM 

; Description      :  Budget Vs Actual  (or) Over All Consolidation  - HERE ACC - CATEGORY WISE TAKEN

; Change Person    :  ASLAM

; Last Change Date :  10/02/2026 10.25 AM

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

CREATE PROCEDURE SP_Bud_and_Actual_2(@gblcode int,@Guid nvarchar(256),@OrdID nvarchar(4000),@Reqd_TaxInPL char(1),@GPAY char(3) ='YES') as  

BEGIN--B0    
SET NOCOUNT ON     
SET ANSI_NULLS ON    
SET QUOTED_IDENTIFIER ON    
declare @Sno int, @MaxSno int, @OrdQty int
declare @partial char(2)    
--@ordid int    
delete from Temp_BudgetAndActual where Guid=@Guid    
delete from Temp_BudgetAndActualAbs where Guid=@Guid    
/*Add Budget Yarn*/    
insert into Temp_BudgetAndActual(Guid, slno, ordid,deptid,budgetqty,budgetamt,processSno)    
select     @Guid, 1,  yarn1.ordid, yarn1.deptid, Case When IsNull(masd.Manual_BudgetKGs_Entry,'N') ='Y'  Then 
sum(IsNull(yarn2.Qty,0)) Else sum(yarn1.reqkgs) End as Budgetqty, Case When IsNull(masd.Manual_BudgetKGs_Entry,'N') = 'Y'
Then sum(IsNull(yarn2.Qty,0)*(isnull(yarn2.rate,0) /*+ isnull(yarn2.Addrate,0)*/)) Else 
sum(yarn1.reqkgs*(isnull(yarn2.rate,0)/* + isnull(yarn2.Addrate,0) */ )) End as budgetamt ,1 from  pro_reqyarn yarn1 (nolock)    
inner join pro_reqyarn2 yarn2 (nolock)     on yarn1.ordid  = yarn2.ordid       and yarn1.deptid = yarn2.deptid        
and yarn1.Colid  = yarn2.Colid       AND yarn1.CountId = yarn2.CountId      INNER JOIN Mas_Dept  masd  (nolock)     
ON yarn1.DeptID = masd.DeptID  And yarn2.DeptID = masd.DeptID      where yarn1.ordid  in (select id from fnSplitter(@OrdID))    
GROUP BY yarn1.ordid,yarn1.deptid,isNull(masd.Manual_BudgetKGs_Entry,'N')    
 /*Add Budget Fabric*/    
insert into Temp_BudgetAndActual      (Guid ,slno ,ordid  ,deptid  ,budgetqty  ,budgetamt,processsno)    
SELECT   @Guid ,1  ,Kn.OrdId ,Kn.DeptId ,     SUM((CASE WHEN U2.UOM = 'KGS' THEN Kn.ReqKgs ELSE Kn.ReqMtr END)) ,    
SUM((CASE WHEN U2.UOM = 'KGS' THEN Kn.ReqKgs ELSE Kn.ReqMtr END) * (ISNULL(Kn2.Rate, 0)  /* + ISNULL(Kn2.AddRate, 0)*/)),1    
FROM   Pro_ReqKnitt Kn  (nolock)     INNER JOIN  Pro_ReqKnitt2 Kn2 (nolock)     ON  Kn.OrdId = Kn2.OrdId  AND  
Kn.DeptId  = Kn2.DeptId AND  Kn.FabId = Kn2.FabId AND Kn.ColId = Kn2.ColId  AND  Kn.CntID  = Kn2.CntID  AND  Kn.GSM  = Kn2.GSM 
AND  Kn.DesignId  = Kn2.DesignId     AND Kn.GG  = Kn2.GG   AND  Kn.LL   = Kn2.LL  AND  Kn.DiaID = Kn2.DiaID  And  
Kn.FinDiaID  = Kn2.FinDiaID   AND kn.Fingsm = Kn2.Fingsm   INNER JOIN  Mas_Uom U1   (nolock)        INNER JOIN  Mas_Fabric MF  
(nolock) ON  U1.UomID  = MF.PriUomID     ON MF.FabID = Kn2.FabId       LEFT OUTER JOIN Mas_UOM  U2   (nolock) ON  
Kn2.RateUOM  = U2.UOMID     WHERE Kn.OrdId IN (select id from fnSplitter(@OrdID))     GROUP BY Kn.OrdId, Kn.DeptId    
  /*Add Budget Accessories*/    
insert into Temp_BudgetAndActual  (Guid,slno ,ordid,deptid ,budgetqty,budgetamt,processsno,AccCatID) SELECT @Guid,1  ,AR.OrdID ,16 , 
SUM(AR.ReqdQty) ,SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) /* + ISNULL(ABR.AddRate, 0)*/ )),2,Mas_Acc.CatId   FROM  PRO_AccReq AR  (nolock)
INNER JOIN Pro_AccBudRate ABR (nolock) ON   AR.OrdID  = ABR.OrdID     AND   AR.Acc_Type  = ABR.Acc_Type  AND AR.Acc_Desc = 
ABR.Acc_Desc          AND   AR.Clr   = ABR.Clr       AND AR.Siz  = ABR.Siz  AND AR.PrsId  = ABR.PrsId    
INNER JOIN OrderMas ON AR.Ordid =OrderMas.Ordid 
INNER JOIN Mas_Acc ON Ar.Acc_Type = Mas_Acc.ID  And ABr.Acc_Type = Mas_Acc.ID 
WHERE AR.ordid in(select id from fnSplitter(@OrdID)) And PurchaseType='Purchase'
   group by AR.ordid,Mas_Acc.CatId 

--Nasima 
--Union
--SELECT @Guid,1  ,AR.OrdID ,17  ,SUM(AR.ReqdQty) ,
--SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) + ISNULL(ABR.AddRate, 0)))    
--FROM  PRO_AccReq AR  (nolock)    
--INNER JOIN Pro_AccBudRate ABR (nolock) ON   AR.OrdID  = ABR.OrdID     
--AND   AR.Acc_Type  = ABR.Acc_Type  AND AR.Acc_Desc = ABR.Acc_Desc         
--AND   AR.Clr   = ABR.Clr       AND AR.Siz  = ABR.Siz  AND AR.PrsId  = ABR.PrsId    
--INNER JOIN OrderMas ON AR.Ordid = OrderMas.Ordid 
--WHERE AR.ordid in(select id from fnSplitter(@OrdID))  And AR.ItemType='S' And PurchaseType='Process'  
--group by AR.ordid

 Union SELECT @Guid,1  ,AR.OrdID ,AR.PrsID  ,SUM(AR.ReqdQty) ,
 SUM(AR.ReqdQty * (ISNULL(ABR.BudRate, 0) /* + ISNULL(ABR.AddRate, 0) */ )) ,2,0  FROM  PRO_AccReq AR  (nolock)    
 INNER JOIN Pro_AccBudRate ABR (nolock)    ON   AR.OrdID  = ABR.OrdID     AND   AR.Acc_Type  = ABR.Acc_Type  AND 
 AR.Acc_Desc = ABR.Acc_Desc          AND   AR.Clr   = ABR.Clr       AND AR.Siz  = ABR.Siz  AND AR.PrsId  = ABR.PrsId     
 INNER JOIN OrderMas ON AR.Ordid = OrderMas.Ordid INNER JOIN Mas_Dept ON Mas_dEpt.DeptID=Ar.PrsID 
 INNER JOIN Mas_Acc ON Ar.Acc_Type = Mas_Acc.ID  And ABr.Acc_Type = Mas_Acc.ID 
WHERE 
AR.ordid in(select id from fnSplitter(@OrdID))  And AR.ItemType='S' And PurchaseType='Process'  and Mas_Dept.AccProsDept='Y' 
 group by AR.ordid,Ar.PrsID,Mas_Acc.CatID

/*Other than Requirment and Budgetting Department Arrival*/    

insert into Temp_BudgetAndActual     (Guid, slno,ordid,deptid ,budgetqty ,budgetamt,ProcessSno)    
Select DISTINCT @Guid, 1 ,OrdID,Prs_Dept ,0   ,0,3 from Trs_Del1 (nolock)    INNER JOIN Trs_Del2 (nolock) ON 
Trs_Del1.ID = Trs_Del2.ID  And Prs_DEpt <>16 And Prs_dept <> -1 and Trs_Del2.Ordid IN (select id from fnSplitter(@OrdID))     
Where Prs_dept    not in (  Select distinct DeptId From Pro_ReqYarn (nolock) Where OrdID IN(select id from fnSplitter(@OrdID))     
UNION     Select distinct DeptId From Pro_ReqKnitt (nolock) Where OrdID in(select id from fnSplitter(@OrdID)) 

 --'Following Condition Added By Nasima 

UNION Select Distinct  Prsid From PRO_AccReq INNER JOIN Temp_BudgetAndActual ON Temp_BudgetAndActual.DeptId=PRO_AccReq.PrsID 
and Temp_BudgetAndActual.OrdId=PRO_AccReq.OrdID Where  GUID=@GUID and Temp_BudgetAndActual.OrdId  In 
(select id from fnSplitter(@OrdID)) )  

/*Add Budget PcsProcess*/    

insert into Temp_BudgetAndActual     (Guid,slno ,ordid  ,deptid  ,budgetqty,  budgetamt,processsno)    
select @Guid,2  ,PP.ordid ,PP.prodpros,IsNull(Sum(IsNull(PP.Qty,0)),0),
(isnull(PP.rate,0) /*  + isnull(PP.Addrate,0)*/ )* IsNull(Sum(IsNull(PP.Qty,0)),0) ,4 From Pro_ProdPros PP (nolock) 
INNER JOIN ORderMas ON PP.OrdId = OrderMas.Ordid Where PP.ordid in(select id from fnSplitter(@OrdID)) and PP.rate>0      
group by PP.ordid,PP.prodpros,PP.rate,PP.Addrate

--/* cutPlanQty Column Added - SemiFinished*/    

  Begin  If (Select Isnull(JobType,'Ord') From OrderMas Where OrdId =@OrdID)='Job' BEGIN  
insert into Temp_BudgetAndActual     (Guid,slno ,ordid, deptid,budgetqty  ,budgetamt, ActualQty,ActualAmt ,StageID,processsno)    
Select @Guid,3  ,Ordid, Deptid,Sum(budgetqty) ,Sum(OrderQty * Rate) ,    
case when (Sum(budgetqty)*ActualRate)>0 then Sum(budgetqty) else 0 end ,Sum(budgetqty)*ActualRate , StageID,4   From 
(select distinct PE.ordid,MD.deptid,PE.styleno,case when isNull(Allow_Excess_InBudget,'N') ='N' then 
IsNull(Sum(QD.OrderQty),0)  Else IsNull(Sum(QD.CutPlanQty),0)  End orderQty, Case When (isnull(PR.rate,0))>0 Then 
(isnull(PR.rate,0) ) Else (isnull(PR.JobWrkRate,0)) End as  Rate,ActualRate,PE.wrkid as StageID,
case when isNull(Allow_Excess_InBudget,'N') ='N' then case when (Sum(QD.OrderQty)*isnull((PR.rate),0))>0 Or 
(Sum(QD.OrderQty)*isnull((PR.JobWrkRate ),0))>0 then Sum(QD.OrderQty) else 0 end Else case when 
(Sum(QD.CutPlanQty)*isnull((Pr.rate),0))>0 Or (Sum(QD.CutPlanQty)*isnull((Pr.JobWrkRate),0))>0  then Sum(QD.CutPlanQty) 
else 0 end End as budgetqty  /*chandru*/  from Trs_ProdExp  PE  (nolock)    Inner Join  OrderQtyDtl  QD  (nolock)  On 
PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID 
and PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID AND QD.PartID = PR.PartID  LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On 
PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID  left outer join 
mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id     left outer join mas_dept  MD 
 (nolock)  on JW.deptid = MD.deptid     left outer join options on 1 =1 where PE.ordid in(select id from fnSplitter(@OrdID)) 
 and MD.SEMIFINISH ='S'       group by PE.ordid, MD.deptid, ActualRate, PE.wrkid, PE.styleno, isnull(PR.rate,0),
 isnull(PR.addrate,0
) ,isnull(PR.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N')   ) A 
Group by ordid, deptid, actualrate, StageID   
end Else Begin

--Swetha TicketNo - 3663 PS Exports OrderQty has been taken from Pro_Prod_PartwiseRate AND OrderQtyDtl table has been removed

/* cutPlanQty Column Added - SemiFinished*/    



insert into Temp_BudgetAndActual     (Guid,slno ,ordid, deptid,budgetqty  ,budgetamt, ActualQty,ActualAmt,StageID,processsno)    
Select @Guid,3  ,Ordid, Deptid,Sum(budgetqty) ,Sum(OrderQty * Rate) ,    case when (Sum(budgetqty)*ActualRate)>0 then 
Sum(budgetqty) else 0 end ,Sum(budgetqty)*ActualRate , StageID,4   From 
(select distinct PE.ordid,MD.deptid,PE.styleno,case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(PR.OrderQty),0)  
Else IsNull(Sum(PR.ORderQtyExcess),0)  End orderQty, Case
 When (isnull(PR.rate,0))>0 Then (isnull(PR.rate,0) ) Else (isnull(PR.JobWrkRate,0)) End as  Rate,
 IsNull(ActualRate,0) as ActualRate,PE.wrkid as StageID,case when isNull(Allow_Excess_InBudget,'N') ='N' then case when 
 (Sum(PR.OrderQty)*isnull((PR.rate),0))>0 Or (Sum(PR.OrderQty)*isnull((PR.JobWrkRate ),0))>0 then Sum(PR.OrderQty) else 0 end 
 Else case when (Sum(PR.ORderQtyExcess)*isnull((Pr.rate),0))>0 Or (Sum(PR.ORderQtyExcess)*isnull((Pr.JobWrkRate),0))>0  then
  Sum(PR.ORderQtyExcess) else 0 end End as budgetqty  /*chandru*/  from Trs_ProdExp  PE  (nolock)     
  LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID 
    LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On PE.OrdId = PR1.OrdID and 
PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork   left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id   
  left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid     left outer join options on 1 =1
   where PE.ordid in(select id from fnSplitter(@OrdID)) and MD.SEMIFINISH ='S'    
      group by PE.ordid, MD.deptid, IsNull(ActualRate,0), PE.wrkid, PE.styleno, isnull(PR.rate,0),isnull(PR.addrate,0) ,
	  isnull(PR.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N')   ) A Group by ordid, deptid, actualrate, StageID    
End End 






/* cutPlanQty Column Added - Finished*/    
insert into Temp_BudgetAndActual     (Guid,slno ,ordid, deptid,budgetqty  ,budgetamt, ActualQty,ActualAmt     ,
StageID,processsno)    Select @Guid,3  ,Ordid, Deptid,Sum(budgetqty) ,Sum(OrderQty * Rate) ,    
case when (Sum(budgetqty)*ActualRate)>0 then Sum(budgetqty) else 0 end ,Sum(budgetqty)*ActualRate , StageID ,4    From
 (select distinct PE.ordid,MD.deptid,PE.styleno,case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(QD.SizeQty),0) 
 Else IsNull(Sum(CEILING((QD.SizeQty)+ (QD.SizeQty * QD.Exs_Per /100))),0) End  orderQty, Case When (isnull(PE.rate,0))>0 Then 
 (isnull(PE.rate,0)) Else (isnull(PE.JobWrkRate,0)   ) End as  Rate,ActualRate,PE.wrkid as StageID, 
 case when isNull(Allow_Excess_InBudget,'N') ='N' then IsNull(Sum(QD.SizeQty),0) Else
  Sum(CEILING((QD.SizeQty)+ (QD.SizeQty * QD.Exs_Per /100))) End as budgetqty    from   Trs_ProdExp  PE  (nolock)    
  Inner Join  OrdQtyClrDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = QD.StyleNo left outer join 
  mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id     left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid    
  left outer join options on 1 = 1 where PE.ordid in(select id from fnSplitter(@OrdID)) and MD.SEMIFINISH ='F'       
  group by PE.ordid, MD.deptid, ActualRate, PE.wrkid,
 PE.styleno, isnull(PE.rate,0),isnull(PE.addrate,0) ,isnull(PE.JobWrkRate,0),isNull(Allow_Excess_InBudget,'N')   ) A 
 Group by ordid, deptid, actualrate, StageID 



/* Additional Stages not in budget */
 select stageid from Temp_BudgetAndActual 
 insert into Temp_BudgetAndActual  (Guid,slno ,ordid, deptid,budgetqty,budgetamt,ActualQty,ActualAmt,StageID,processsno)   
 Select @Guid,3  ,Ordid, Deptid,0 ,0 , 0 ,0, StageID,4     From (    select distinct PE.ordid,MD.deptid,PE.styleno,     
 IsNull(Sum(QD.CutPlanQty),0)  orderQty, 0 as  Rate,0 as ActualRate,PE.StageID as StageID,Sum(QD.CutPlanQty) as budgetqty  
   From   Trs_ProdEntry PE  (nolock)    Inner Join  OrderQtyDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = 
   QD.StyleNo     left outer join mas_jobwrkcomp JW  (nolock)  on PE.StageID  = JW.id  left outer join mas_dept  MD  (nolock)
     on JW.deptid = MD.deptid     where PE.ordid in(select id from fnSplitter(@OrdID)) and PE.StageID not in 
	 ( Select Distinct StageID from Temp_BudgetAndActual (nolock) where Stageid is not null and Guid=@Guid)
	 group by PE.ordid, MD.deptid,  PE.StageID, PE.styleno  
 UNION ALL
SELECT DISTINCT Trs_Pcs1.Ordjobno As OrdId, Mas_Dept.DeptID,Trs_Pcs2.StyleNo,IsNull(Sum(QD.CutPlanQty),0)  orderQty,
 0 as  Rate,0 as ActualRate,Mas_JobWrkComp.Id AS StageId,Sum(QD.CutPlanQty) as budgetqty  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderQtyDtl QD ON Trs_Pcs1.Ordjobno = QD.OrdID AND Trs_Pcs2.StyleNo = QD.StyleNo 
 INNER JOIN Mas_JobWrkComp ON Mas_JobWrkComp.Id = Trs_Pcs1.TargetStageID INNER JOIN Mas_Dept ON Mas_Dept.DeptID = 
 Mas_JobWrkComp.DeptId WHERE Trs_Pcs1.Ordjobno IN (SELECT ID FROM fnSplitter(@OrdID)) AND TargetStageID NOT IN 
 (SELECT DISTINCT StageID FROM Temp_BudgetAndActual WHERE StageID IS NOT NULL and Guid=@Guid )
 GROUP BY   Trs_Pcs1.Ordjobno,Mas_Dept.DeptID,Trs_Pcs2.StyleNo,Mas_JobWrkComp.Id) A Group by ordid, deptid,  StageID    
UPDATE Tmp SET Tmp.ActualQty = Z.Qty , Tmp.ActualAmt = Z.Amt  From  (
SELECT 3 As SlNo,Y.Ordid,Y.DeptID,Y.StageID,SUM(Qty) AS Qty ,SUM(Amt) AS Amt, 4 AS ProcessSNo From
(
/* SELECT TPDN.Ordid,TPDN.StyleNo,TPDN.StageID,Mas_JobWrkComp.WorkComplDet,Mas_Dept.DeptID,Mas_Part.PartID,Mas_Part.PartName,ISNULL(Colorid,0) AS ColId,ISNULL(SUM(TPDN.ThisBillQty),0) AS Qty,ISNULL((SUM(TPDN.ThisBillQty) * TPDN.Rate),0) AS Amt FROM Trs_Pr
odBillDetNew TPDN INNER JOIN Trs_HotProcessRate ON Trs_HotProcessRate.Ordid = TPDN.Ordid AND Trs_HotProcessRate.DeptID = TPDN.StageID INNER JOIN Mas_JobWrkComp ON Mas_JobWrkComp.Id = TPDN.StageID INNER JOIN Mas_Dept ON Mas_Dept.DeptID = Mas_JobWrkComp.Dep
tId INNER JOIN Mas_Part ON Mas_Part.PartID = TPDN.Partid WHERE TPDN.Ordid IN (SELECT ID FROM fnSplitter(@OrdID)) GROUP BY TPDN.Ordid,TPDN.StyleNo,TPDN.StageID,Mas_JobWrkComp.WorkComplDet,Mas_Dept.DeptID,Mas_Part.PartID,Mas_Part.PartName,ISNULL(Colorid,0),
TPDN.Rate

UNION ALL */

SELECT TPQ.OrdID,TPQ.styleno,TPQ.Dept AS StageId,Mas_JobWrkComp.WorkComplDet,Mas_Dept.DeptID,Mas_Part.PartID, 
Mas_Part.PartName,ISNULL(ColId,0) As ColId,ISNULL(SUM(TPQ.Mtr),0) AS Qty, CASE WHEN @Reqd_TaxInPL = 'Y' THEN 
ISNULL(SUM(TPQ.NetAmount),0) ELSE ISNULL(SUM(TPQ.Mtr * TPQ.Rate),0) END AS Amt FROM Trs_BillRate TPQ INNER JOIN 
Trs_HotProcessRate ON Trs_HotProcessRate.Ordid = TPQ.OrdID AND Trs_HotProcessRate.DeptID = TPQ.Dept INNER JOIN 
Mas_JobWrkComp ON Mas_JobWrkComp.Id = Trs_HotProcessRate.DeptID INNER JOIN Mas_Dept ON Mas_Dept.DeptID = Mas_JobWrkComp.DeptId 
INNER JOIN Mas_Part ON Mas_Part.PartID = TPQ.PanelID WHERE (TPQ.OrdID IN (SELECT ID FROM fnSplitter(@OrdID)) AND OutputType = 'P')
and Fab_Pcs_Dept ='P'  GROUP BY TPQ.OrdID,TPQ.styleno,TPQ.Dept ,
Mas_JobWrkComp.WorkComplDet,Mas_Dept.DeptID,Mas_Part.PartID, Mas_Part.PartName,ISNULL(ColId,0)) Y WHERE Y.Ordid = @OrdId 
GROUP BY Y.Ordid,Y.DeptID,Y.StageID ) Z  INNER JOIN Temp_BudgetAndActual Tmp ON Tmp.OrdId = Z.Ordid AND Z.DeptID = Tmp.DeptId 
AND Z.StageID = Tmp.StageID AND Tmp.Slno = Z.SlNo WHERE Tmp.GUID = @Guid

/*Inhouse - PRODUCTION */    
select @partial=isnull(ProdbillEntryPartial,'N') from Options 
if @partial='Y'   begin
/* To Reduce Double Time FinDept Insertion */

--swetha ps exports

;with cte(slno,ordid,deptid, actqty, actamt,stid) as 
(select 3,x.ordid,x.deptid,sum(x.qty),sum(x.amt) ,x.StageID from (select TPDN.ordid,MD.DeptID,isnull(sum(TPDN.ThisBillQty),0) 
as qty, /* Swetha Trijosh isnull(sum((TPDN.ThisBillQty * TPDN.Rate)),0) */ CASE WHEN @Reqd_TaxInPL='Y' THEN SUM(TPDN.NetAmount) 
ELSE SUM(TPDN.Amount) END as amt ,TPDN.StageID,TPDN.StyleNo,IsNull(Colorid,0) as Colorid , 0 As PartId   from 
Trs_ProdBillDetNew TPDN inner join Mas_JobWrkComp MJW on MJW.Id=TPDN.StageID inner join Mas_Dept MD on MD.DeptID=MJW.DeptId 
where TPDN.OrdId in(select id from fnSplitter(@OrdID))group by MD.DeptID,TPDN.ordid,TPDN.StageID,TPDN.StyleNo,TPDN.Rate,
IsNull(Colorid,0) 
union all SELECT Distinct TPQ.OrdId,MD.DeptID,   ISNULL(SUM(TPQ.Mtr),0) AS Qty  , Case When /*(Select Isnull(Reqd_TaxInPL,'Y') 
From Options)*/@Reqd_TaxInPL='Y' Then isnull(sum(TPQ.NetAmount ),0) ELSE isnull(SUM(TPQ.Mtr*TPQ.Rate ),0) End as amt,
TPE.WrkId As StageID, TPQ.StyleNo,IsNull(TPQ.ColId,0) As Colorid, TPQ.PanelID As PartId From Trs_ProdExp TPE
 Inner JOIN   Mas_JobWrkComp   MJW  (nolock) ON TPE.WrkId=MJW.Id Inner JOIN   Mas_Dept   MD  (nolock) ON MJW.DeptId=MD.DeptId 
 Inner Join Trs_BillRate  TPQ On TPE.OrdId=TPQ.OrdID And TPQ.StyleNo = TPE.StyleNo And TPE.WrkID=TPQ.Dept Inner Join 
 (SELECT DISTINCT OrdJob,Invid,GrnType FROM Trs_PcsGrn1) Trs_PcsGrn1 on Trs_PcsGrn1.Invid = TPQ.ID And TPQ.OrdID = 
 Trs_PcsGrn1.OrdJob  WHERE  (TPQ.OrdId in (select id from fnSplitter(@OrdID)) And MD.OutputType='P'  And 
 GrnType <> 'Supplier Order Receipt') GROUP BY TPQ.OrdId,MD.DeptID,TPE.WrkId, TPQ.StyleNo,IsNull(TPQ.ColId,0), TPQ.PanelID)x  
 where x.Ordid in(select id from fnSplitter(@OrdID)) group by x.StageID,x.DeptID,x.Ordid)
update tmp    set  ActualQty  = isnull(ActualQty,0) +ActQty,    ActualAmt  = isnull(ActualAmt,0) + ActAmt  From Temp_BudgetAndActual tmp     join cte      on  tmp.ordid  = cte.ordid    and  tmp.Deptid  = cte.Deptid    and  tmp.StageID  = cte.StID     and 
 tmp.Slno  = cte.Slno   where tmp.guid  = @guid    end else
begin
;with   cte(Slno,ordid,DeptID,ActQty    ,ActAmt      ,StID) as (Select 3,Ordid,Deptid,Isnull(Sum (Qty),0) ,Isnull(Sum (Qty * Rate),0) ,StageID--, Isnull(Avg(Rate),0) as  AvgRate 
From (  SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,  case Isnull(TP.Rate,0) when 0 then (    
case Isnull(BPD.Rate,0) when 0 then  TPE.Rate+ ActualRate else Isnull(BPD.Rate,0) end   )   
else TP.Rate end As Rate , TPQ.ProdPcs AS Qty   , 0 As ColorId, 0 As	PartId FROM    Mas_Dept    MD  (nolock)  
RIGHT OUTER JOIN BudPodet    BPD  (nolock)   INNER JOIN   BudPoMas    BPM  (nolock) ON BPD.Id  = BPM.Id
RIGHT OUTER JOIN Trs_ProdentryQty  TPQ  (nolock) INNER JOIN   Trs_Prodentry   TP  (nolock) ON TPQ.id  = TP.id 
INNER JOIN   Mas_JobWrkComp   MJW  (nolock) ON TP.StageID = MJW.Id  ON BPD.Size = TPQ.SizId
AND     BPD.ColId    =  TP.ClrId AND BPD.PartId = TP.PartId AND BPM.DeptId = TP.StageID 
AND     BPM.OrdId    =  TP.OrdId AND BPD.StyleNo = TP.StyleNo ON  MD.DeptID = MJW.DeptId  
LEFT OUTER JOIN  Trs_ProdExp    TPE ( nolock)  ON TP.StyleNo = TPE.StyleNo AND TP.StageID = TPE.WrkID 
AND     TP.OrdId    =  TPE.OrdId
LEFT OUTER JOIN  Pro_Prod_PartwiseRate PPPR (nolock) ON TPE.OrdId = PPPR.OrdID AND TPE.StyleNo = PPPR.StyleNo 
AND     TPE.WrkId    =  PPPR.WrkID AND TP.PartId = PPPR.PartID  
LEFT OUTER JOIN  Bud_InhRateclw PPPR1 (nolock) ON TPE.OrdId = PPPR1.OrdID AND TPE.StyleNo = PPPR1.StyleNo 
AND     TPE.WrkId    =  PPPR1.NWork AND TP.PartId = PPPR1.PartID  and tpq.SizId = PPPR1.SizeId
WHERE  (TP.ReWork=0 and TP.OrdId in(select id from fnSplitter(@OrdID)))
or (RateType_Prs_REWORK = 'P' and TP.OrdId in(select id from fnSplitter(@OrdID))) 
Union All
/* To Reduce Double Time FinDept Insertion */
SELECT Distinct MD.DeptID, TPQ.OrdId, TPE.WrkId As StageID, TPQ.StyleNo,    case Isnull(TPQ.Rate,0) when 0 then 
( case Isnull(TPE.Rate,0) when 0 then Isnull(TPE.Rate,0) end   )     

else TPQ.Rate end As Rate , TPQ.Mtr AS Qty  ,IsNull(TPQ.ColId,0) As Colorid, TPQ.PanelID As PartId   
From Trs_ProdExp TPE Inner JOIN   Mas_JobWrkComp   MJW  (nolock) ON TPE.WrkId=MJW.Id Inner JOIN   Mas_Dept   MD  (nolock) 
ON MJW.DeptId=MD.DeptId Inner Join Trs_BillRate  TPQ On TPE.OrdId=TPQ.OrdID And TPQ.StyleNo = TPE.StyleNo And 
TPE.WrkID=TPQ.Dept Inner Join Trs_PcsGrn1 on Trs_PcsGrn1.Invid = TPQ.ID And TPQ.OrdID = Trs_PcsGrn1.OrdJob  
WHERE  (TPQ.OrdId in (select id from fnSplitter(@OrdId)) And MD.OutputType='P'  And GrnType <> 'Supplier Order Receipt')
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
where tmp.guid  = @guid     
 ;with   cte(Guid,Slno ,ordid,DeptID ,ActQty    ,ActAmt      ,StID) as    
(    */
Union all
--Select    @Guid,4  ,Ordid,Deptid ,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate    
--Select   4  ,Ordid,Deptid ,Isnull(Sum (Qty),0),Isnull(Sum (Qty * Rate),0) ,StageID     --Isnull(Avg(Rate),0) as  AvgRate 
--  From (    
SELECT MD.DeptID, TP.OrdId, TP.StageID, TP.StyleNo,Isnull(BPD.Rate,0) Rate ,     
TPQ.ProdPcs AS Qty     , 0 As ColorId, 0 As PartId    
FROM  Mas_Dept  MD  (nolock) RIGHT OUTER JOIN BudPodet  BPD  (nolock) INNER JOIN   BudPoMas BPM  (nolock) ON BPD.Id  = BPM.Id     
RIGHT OUTER JOIN Trs_ProdentryQty  TPQ  (nolock)    INNER JOIN   Trs_Prodentry   TP  (nolock) ON TPQ.id  = TP.id     
INNER JOIN   Mas_JobWrkComp   MJW  (nolock) ON TP.StageID = MJW.Id  ON  BPD.Size = TPQ.SizId     
AND     BPD.ColId    =  TP.ClrId AND BPD.PartId = TP.PartId  AND  BPM.DeptId = TP.StageID     
AND     BPM.OrdId    =  TP.OrdId AND BPD.StyleNo = TP.StyleNo ON  MD.DeptID = MJW.DeptId     
LEFT OUTER JOIN  Trs_ProdExp  TPE  (nolock) ON TP.StyleNo = TPE.StyleNo AND  TP.StageID = TPE.WrkID  AND  TP.OrdId  =  TPE.OrdId      
LEFT OUTER JOIN  Pro_Prod_PartwiseRate PPPR (nolock) ON TPE.OrdId = PPPR.OrdID AND  TPE.StyleNo = PPPR.StyleNo     
AND     TPE.WrkId    =  PPPR.WrkID AND TP.PartId = PPPR.PartID     
 LEFT OUTER JOIN  Bud_InhRateclw PPPR1 (nolock) ON TPE.OrdId = PPPR1.OrdID AND  TPE.StyleNo = PPPR1.StyleNo     
AND     TPE.WrkId    =  PPPR1.NWork AND TP.PartId = PPPR1.PartID     and tpq.SizId = PPPR1.SizeId
WHERE (TP.ReWork  = 1  And TP.OrdId  in(select id from fnSplitter(@OrdID)) )    
or (    BPM.RateType_Prs_REWORK = 'R' And TP.OrdId  in(select id from fnSplitter(@OrdID))))as A  Group by Ordid, Deptid ,StageID) 
update tmp    set  ActualQty  = isnull(ActualQty,0) +ActQty,    ActualAmt  = isnull(ActualAmt,0) + ActAmt    
From Temp_BudgetAndActual tmp  join cte  on  tmp.ordid  = cte.ordid  and  tmp.Deptid  = cte.Deptid  and  tmp.StageID = cte.StID    
and  tmp.Slno  = cte.Slno    where tmp.guid  = @guid     

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
WHERE (TP.ReWork  = 1   And TP.OrdId  in(select id from fnSplitter(@OrdID)))    
or  (BPM.RateType_Prs_REWORK = 'R' And TP.OrdId  in(select id from fnSplitter(@OrdID)))    
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
Type,          Description,Processsno)    
 SELECT        @Guid, 5, BC.OrdID, null,  null,    null,  null,     ISNULL(MC.Type, '-') AS Type, MC.Descr,5    
FROM  PRo_BudCommercial BC (nolock)   INNER JOIN Mas_Commercial  MC (nolock)   ON   BC.ComID =  MC.ID      
and   BC.OrdID in     (select id from fnSplitter(@OrdID))    ;with   cte(ordid,budqty,budamt,comdesc) as      
(    
SELECT     BC.OrdID,
case when isNull(Options.Allow_Excess_InBudget,'N')='Y'  then Isnull(sum( QD.CutPlanQty),0) ELSE Isnull(sum( QD.OrderQty),0) 
END AS  budgetqty,    
--case  rtrim(MC.Pers_PerPcs)     
--when '%' then isnull(sum(QD.orderqty),0)*BC.Val    
 --when 'P' then ISNULL(Sum(QD.OrderQty * SaleRate * isnull(OM.Crate,0)),0)/100 * BC.Per    
--else BC.Total     
--end      
 Isnull(BC.total,0) AS budgetamt,MC.Descr   FROM   PRo_BudCommercial BC (nolock)  
 INNER JOIN  Mas_Commercial MC  (nolock) ON BC.ComID = MC.ID  and BC.OrdID in (select id from fnSplitter(@OrdID))   
LEFT OUTER JOIN OrderMas OM    (nolock) ON OM.OrdId = BC.OrdID    
LEFT OUTER JOIN OrderQtyDtl QD   (nolock) ON OM.OrdId = QD.OrdID     
LEFT JOIN Options ON 1 = 1
where BC.OrdID in(select id from fnSplitter(@OrdID))    
GROUP BY BC.Total,MC.Pers_PerPcs,BC.OrdID, MC.Type, MC.Descr, BC.Per, BC.Val, MC.ID ,isNull(Options.Allow_Excess_InBudget,'N'))    
update tmp    set  budgetqty  = budqty,   budgetamt  = budamt    From Temp_BudgetAndActual tmp    join cte     
on  tmp.ordid  = cte.ordid  and  tmp.Description = cte.comdesc   and  tmp.slno   = 5   where tmp.guid  = @guid      

;with   cte(ordid,actqty,actamt,comdesc) as      
(Select  c.OrdID,     case when isnull(SUM(b.BillAmount), 0) >0 then   ISNULL(SUM(TP2.Pcs), 0) else 0 end AS ActualQty,     

--Nasima 
  --isnull(SUM(b.BillAmount), 0) AS ActualAmt, 
Case When /*(Select Isnull(Reqd_TaxInPL,'Y') From Options)*/
@Reqd_TaxInPL='Y' Then (isnull(SUM(b.BillAmount+b.TaxAmt), 0)) else  (isnull(SUM(b.BillAmount), 0)) END   AS ActualAmt,
d.Descr AS Description    
from shippingBill a inner join Shippingbill_det b on a.id = b.cid    INNER JOIN PRo_BudCommercial c   
 on c.ComID = b.CommID and b.OrdID = c.OrdID    inner join Mas_Commercial d on d.ID = c.ComID and d.ID = b.CommID   
 LEFT OUTER JOIN Trs_Pcs1 TP1   (nolock) ON c.OrdID = TP1.Ordjobno and TP1.DelType = 'Despatch'    and a.dept = tp1.dept 
 LEFT OUTER JOIN Trs_Pcs2 TP2   (nolock) ON TP1.ID = TP2.ID  Where  b.OrdID in(select id from fnSplitter(@OrdID)) 
group by c.OrdID,d.Descr,a.Type )    

update tmp     set  ActualQty = actqty ,    ActualAmt = actamt 
From Temp_BudgetAndActual tmp    join cte   on  tmp.ordid  = cte.ordid   and  tmp.Description = cte.comdesc    
INNER JOIN OrderMas OM1 (nolock) ON tmp.Ordid = OM1.Ordid and  tmp.slno   = 5   where tmp.guid  = @guid      

/* Bills==>Expenses Amount Are Must Be Displayed in Report if is not in Budget commercial*/    

insert into Temp_BudgetAndActual    
(  Guid,slno ,ordid,ActualQty,ActualAmt ,Type,Description ,budgetqty ,budgetamt,processsno)    
Select @Guid,5  ,Ordid,0  ,sum(Amount),MC.Type,Descr   ,0   ,0 ,5 from  Trs_Expenses TE (nolock)    
inner join  Mas_commercial MC (nolock) on TE.Expid = MC.id  where ordid in(select id from fnSplitter(@OrdID))
 Group by Ordid,Descr,MC.Type    

/* CASH EXPENSES ENTRY */
insert into Temp_BudgetAndActual    
(  Guid,slno ,ordid,ActualQty,ActualAmt ,Type,Description ,budgetqty ,budgetamt,processsno)    
Select @Guid,6  ,Ordid,0  ,sum(Amount),MC.Type,Descr   ,0   ,0 ,6
from  Trs_CashExpenses1 A INNER JOIN Trs_CashExpenses2 B ON A.ID = B.ID   INNER JOIN Mas_Commercial MC ON A.ExpenseId = MC.Id 
where ordid in(select id from fnSplitter(@OrdID)) Group by Ordid,Descr,MC.Type    
/*Add Actual Amount Details    
Instead of Amount -> NetAmount Taken NetAmount=Amount+Tax Cal*/    
 /* Yarn and Fabric Releated Actual Posting */

 ;with   cte(ordid,actqty,actamt,DeptID) as      
(    Select X.OrdId,Sum(X.Qty),Sum(X.NetAmount),X.Dept From (
SELECT   TBR.OrdID, Case When ISNULL((TBR.Mtr), 0)=0 Then ISNULL((TBR.Kgs), 0) Else ISNULL((TBR.Mtr), 0) End As Qty,
Case When @Reqd_TaxInPL='Y' And IsNull(Fcy,0)>0   then (TBR.netamount) * IsNull(exchangeRate,0)  Else 
Case When @Reqd_TaxInPL='Y' And IsNull(Fcy,0)=0   then (TBR.netamount) ELSE
Case When @Reqd_TaxInPL='N' And IsNull(Fcy,0)>0   then (TBR.Amount) * IsNull(exchangeRate,0)  Else 
Case When @Reqd_TaxInPL='N' And IsNull(Fcy,0)=0   then (TBR.Amount) END END END END as netamount ,TBR.Dept FROM   
Trs_Bills    TB (nolock)   INNER JOIN  Trs_BillRate   TBR (nolock) ON TB.ID = TBR.ID   INNER JOIN  
Temp_BudgetAndActual TDA (nolock) ON TBR.dept = TDA.DeptID and TBR.OrdID = TDA.OrdId    
INNER JOIN  Mas_Dept  MD  (nolock) ON TBR.dept=MD.Deptid   Left Join Trs_Po1 On TBR.PoId=Trs_Po1.Id 
WHERE  TBR.OrdID  in (select id from fnSplitter(@OrdID)) and TDA.Slno =1 and tda.guid = @guid And TB.Type<>'PP'  And MD.InputType <>'-'   And 
(TBR.ID = (SELECT DISTINCT invid FROM trs_grn1 INNER JOIN trs_grn2 ON trs_grn1.id=trs_grn2.Id WHERE trs_grn2.Invid = TBR.id 
AND trs_grn2.Invid = TB.id AND dept = TBR.Dept and trs_grn2.OrdId=TBR.OrdId and Trs_Grn2.ORDID=@OrdID Union  
SELECT DISTINCT invid FROM Trs_MultiPrs_Grn1 trs_grn1 INNER JOIN Trs_MultiPrs_Grn3 trs_grn2 ON trs_grn1.id=trs_grn2.Id WHERE trs_grn2.Invid = TBR.id 
AND trs_grn2.Invid = TB.id AND deptID = TBR.Dept and trs_grn2.OrdId=TBR.OrdId and Trs_Grn2.ORDID=@OrdID ))) X
GROUP BY X.OrdID, X.dept )    
update tmp   set  ActualQty = actqty,  ActualAmt =actamt   from Temp_BudgetAndActual tmp   join cte  on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID  INNER JOIN  Mas_Dept  MD  (nolock) ON Cte.deptID=MD.Deptid  where tmp.guid = @guid and slno=1
    and MD.InputType <>'-' 
/* Fabric Releated Actual Posting FOR OWN PARTY */

 ;with   cte(ordid,actqty,actamt,DeptID) as      
( Select X.OrdId,Sum(X.Qty),Sum(X.NetAmount),X.Dept From (
SELECT   B.OrdID, Case When ISNULL((B.Recmtr), 0)=0 Then ISNULL((B.RecKgs), 0) Else ISNULL((B.Recmtr), 0) End As Qty, 
IsNull(P.Rate,0) * Isnull(B.RecKgs,0) As NetAmount,A.dept      FROM   Trs_Grn1 A INNER JOIN Trs_GRN2 B ON A.ID = B.ID   
INNER JOIN StockTable C ON B.StockID = C.StockID INNER JOIN Pro_ReqKnitt2 P ON B.ordid = P.OrdId And P.FabId = C.FabID And
  P.CntID = C.CntID And P.ColId = C.ColID And P.DiaID = C.DiaID And P.FinDiaId = C.FinDiaID And P.GSM = C.Gsm
And P.GG = C.GG And P.LL = C.LL and P.DesignID = C.PRINT_DESIGNID And P.SubPrsID = A.SubPrsID And P.FinGSM = C.FinGsm 
INNER JOIN Mas_Party ON A.SuppID = Mas_Party.PID INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON A.dept = TDA.DeptID and 
B.OrdID = TDA.OrdId    INNER JOIN  Mas_Dept  MD  (nolock) ON A.Dept=MD.Deptid    WHERE  B.OrdID  in
 (select id from fnSplitter(@OrdID)) and TDA.Slno =1 And isnull(A.processtype,'')<>'R' and Own_Party='Y' and tda.guid = @guid  
 and MD.OutputType ='F'  ) X GROUP BY X.OrdID, X.dept  )    

update tmp   set  ActualQty = IsNull(ActualQty,0) + actqty, ActualAmt =IsNull(ActualAmt,0) + actamt  
from Temp_BudgetAndActual tmp    join cte  on  tmp.ordid = cte.ordid    and  tmp.DeptID = cte.DeptID    
INNER JOIN  Mas_Dept  MD  (nolock) ON Cte.deptID=MD.Deptid  where tmp.guid = @guid and slno=1    and MD.OutputType ='F'

/* YARN Releated Actual Posting FOR OWN PARTY */

 ;with   cte(ordid,actqty,actamt,DeptID) as      
 ( Select X.OrdId,Sum(X.Qty),Sum(X.NetAmount),X.Dept From (
SELECT   B.OrdID, Case When ISNULL((B.Recmtr), 0)=0 Then ISNULL((B.RecKgs), 0) Else ISNULL((B.Recmtr), 0) End As Qty, 
IsNull(P.Rate,0) * Isnull(B.RecKgs,0) As NetAmount,A.dept      FROM   Trs_Grn1 A INNER JOIN Trs_GRN2 B ON A.ID = B.ID   
INNER JOIN StockTable C ON B.StockID = C.StockID 
INNER JOIN Pro_ReqYarn2 P ON B.ordid = P.OrdId And  P.CountId = C.CntID
And P.ColId = C.ColID  INNER JOIN Mas_Party ON A.SuppID = Mas_Party.PID INNER JOIN  Temp_BudgetAndActual TDA (nolock) 
ON A.dept = TDA.DeptID and B.OrdID = TDA.OrdId    INNER JOIN  Mas_Dept  MD  (nolock) ON A.Dept=MD.Deptid      
WHERE  B.OrdID  in (select id from fnSplitter(@OrdID)) and TDA.Slno =1 And IsNull(A.processtype,'')<>'R' and Own_Party='Y' 
and tda.guid = @guid  and (MD.OutPutType ='Y')  ) X GROUP BY X.OrdID, X.dept  )    

update tmp     
set  ActualQty = IsNull(ActualQty,0) + actqty, ActualAmt =IsNull(ActualAmt,0) + actamt  from Temp_BudgetAndActual tmp    
join cte  on  tmp.ordid = cte.ordid    and  tmp.DeptID = cte.DeptID  INNER JOIN  Mas_Dept  MD  (nolock) ON Cte.deptID=MD.Deptid      
where tmp.guid = @guid and slno=1    and (MD.OutPutType ='Y')

/* Accessory Releated Actual Posting */

;with   cte(ordid,actqty,actamt,DeptID,AcccatId) as      
(    SELECT Ordid,Sum(Kgs) as KGs, Sum(NetAmount) as NetAmount,Dept,AccCatID  FROM (SELECT   TBR.OrdID,   ISNULL(SUM(TBR.Kgs), 0) Kgs ,
Case When /*(Select Isnull(Reqd_TaxInPL,'Y') From Options)*/@Reqd_TaxInPL='Y' Then 
Case When IsNull(BillType,'')in('Purchase','Process') Then Case When IsNull(Trs_Po1.Fcy,0)>0 Then
 Sum(TBR.NetAmount)  * IsNull(exchangeRate,0) ELSE Sum(TBR.NetAmount) END END  Else 
 Case When IsNull(BillType,'')in('Purchase','Process')  Then Case When IsNull(Trs_Po1.Fcy,0)>0 Then   
 Sum(TBR.Amount) *  IsNull(exchangeRate,0) ELSE  Sum(TBR.Amount) END END END As NetAmount ,TBR.dept,Mas_Acc.CatId as AccCatID  FROM        
 Trs_Bills    TB (nolock)    INNER JOIN  Trs_BillRate   TBR (nolock) ON TB.ID = TBR.ID  Left Join Trs_Po1 On TBR.PoId=Trs_Po1.Id 
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TBR.dept = TDA.DeptID and TBR.OrdID = TDA.OrdId    
INNER JOIN  Mas_Dept  MD  (nolock) ON TBR.dept=MD.Deptid   INNER JOIN ORDERMAS ON TBR.ORDID = ORDERMAS.ORDID 	
INNER JOIN Mas_Acc ON TBR.Atype = Mas_Acc.ID  And TDA.accCatID = Mas_Acc.CatId
WHERE  TBR.OrdID  in (select id from fnSplitter(@OrdID)) and TDA.Slno =1 and tda.guid = @guid 
and MD.InputType ='-' and MD.OutPutType='-'   And TB.Type='AC' 
GROUP BY TBR.OrdID, TBR.dept ,IsNull(BillType,''),IsNull(exchangeRate,0) ,IsNull(Trs_Po1.Fcy,0),Mas_Acc.CatId ) X GROUP BY ORDID,Dept ,AccCatID )    

update tmp    set  ActualQty = actqty, ActualAmt =actamt    from Temp_BudgetAndActual tmp   join cte on  tmp.ordid = cte.ordid    
and  tmp.DeptID = cte.DeptID and tmp.accCatID = cte.AcccatId   INNER JOIN  Mas_Dept  MD  (nolock) ON cte.deptID=MD.Deptid      
where tmp.guid = @guid and slno=1    and MD.InputType ='-' and MD.OutPutType='-'    



/* Opening Stock - rk*/    
 ;with   cte(ordid,actqty,actamt,DeptID) as      
 (    SELECT OP.OrdID,sum(OP.TotKg) AS TotKg,sum(OP.totAmt) AS totAmt,OP.Dept  FROM (select OrdID,CASE WHEN ISNULL(MtrPc,0)>0 THEN Isnull(Sum(MtrPc),0) ELSE Isnull(Sum(kgs),0) END as TotKg ,CASE WHEN ISNULL(MtrPc,0)>0 THEN Isnull(SUM(MtrPc*Rate),0) ELSE 
Isnull(SUM(kgs*Rate),0) END as totAmt ,Dept FROM  Trs_Opening GROUP BY OrdID,ISNULL(MtrPc,0),Dept)   OP    INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON OP.dept = TDA.DeptID where OP.OrdID in (select id from fnSplitter(@OrdID)) AND TDA.Slno =1 and tda.
guid = @guid group by OP.OrdID,Dept)    
update tmp   set  ActualQty = isnull(ActualQty,0) + actqty,  ActualAmt = isnull(ActualAmt,0) + actamt  
from Temp_BudgetAndActual tmp   join cte   on  tmp.ordid = cte.ordid   and  tmp.DeptID = cte.DeptID    
where tmp.guid = @guid and slno=1     
/*Transfer In*/     

 ;with   cte(ordid,actqty,actamt,DeptID) as      
 (     select tranordid,Isnull(Sum(Kg),0) TotKg, Isnull(Sum(Kg*Rate),0) TotAmt,prs_dept   from  trs_del1    TD1 (nolock)    
inner join trs_del2    TD2 (nolock) on TD1.id = TD2.id     
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TD2.tranordid = TDA.Ordid  and TD1.Prs_Dept = TDA.DeptID     
 where tranordid in (select id from fnSplitter(@OrdID))  AND TDA.Slno =1 and tda.guid = @guid    group by tranordid,prs_dept)    
update tmp set  ActualQty = isnull(ActualQty,0) + actqty,  ActualAmt = isnull(ActualAmt,0) + actamt  
from Temp_BudgetAndActual tmp  join cte  on  tmp.ordid = cte.ordid  and  tmp.DeptID = cte.DeptID    
where tmp.guid = @guid and slno=1     
/*Transfer out*/    
;with   cte(ordid,actqty,actamt,DeptID) as      
(select TD2.ordid,Isnull(Sum(Kg),0) TotKg, Isnull(Sum(Kg*Rate),0) TotAmt ,prs_dept    
from  trs_del1 TD1 (nolock)    inner join trs_del2 TD2    (nolock) on TD1.id = TD2.id     
 INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON TD2.Ordid = TDA.Ordid  and TD1.Prs_Dept = TDA.DeptID      
 where trtype in (3,8) AND TD2.ordid in (select id from fnSplitter(@OrdID))  AND TDA.Slno =1 and tda.guid = @guid    
group by TD2.ordid,prs_dept)    
update tmp set  ActualQty = isnull(ActualQty,0) - actqty, ActualAmt = isnull(ActualAmt,0) - actamt 
 from Temp_BudgetAndActual tmp Inner join cte  on  tmp.ordid = cte.ordid  and  tmp.DeptID = cte.DeptID    
where tmp.guid = @guid  and slno=1    
 /* For Actual Pcs Forms */    

;with   cte(ordid,actqty,actamt,DeptID) as  ( SELECT BR.OrdID ,ISNULL(SUM(BR.Mtr), 0) AS ActKgs, SUM(BR.Amount) AS Amount, 
BR.dept   FROM  Trs_Bills  TB   (nolock)      INNER JOIN  Trs_BillRate BR   (nolock) ON TB.ID = BR.ID     
INNER JOIN  Temp_BudgetAndActual TDA (nolock) ON BR.dept = TDA.DeptID  WHERE  BR.OrdID in (select id from fnSplitter(@OrdID))  
AND TDA.Slno =2 and tda.guid = @guid   GROUP BY BR.OrdID ,BR.dept  )    
update tmp   set  ActualQty = isnull(ActualQty,0) + actqty, ActualAmt = isnull(ActualAmt,0) + actamt  from Temp_BudgetAndActual 
tmp     join cte  on  tmp.ordid = cte.ordid  and  tmp.DeptID = cte.DeptID  where tmp.guid = @guid and slno=2    
 update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from   
(select Y.ordid,departmentid as Dept,IsNull(Sum(Y.ProdPcs),0) as kgs,Sum(Wages) as netamount from Wages_ProductionMas X 
INNER JOIN Wages_ProductionDet Y ON X.MasSlno = Y.DetSlno INNER JOIN OrderMas ON Y.Ordid = OrderMas.Ordid 
Group by Y.ordid,departmentID) a    
inner join Temp_BudgetAndActual  b on a.ordid=b.ordid and a.dept=b.deptid  inner join MAs_dept as c(nolock)  on 
b.deptid=c.deptid where               b.ordid in (select id from fnSplitter(@OrdID)) and slno=3     and b.guid=@guid

/* Supplier Entry*/

Declare @SupplierOrd As Integer

Select @SupplierOrd = COUNT(*) from SuppOrdMas  Where Ordid in (select id from fnSplitter(@OrdID)) 
/* To Reduce Double Time FinDept Insertion */
Declare @FActAmt As Integer
Select @FActAmt = COUNT(*) From Temp_BudgetAndActual Inner JOin Mas_Dept On Mas_Dept.DeptID = Temp_BudgetAndActual.DeptId 
Where OrdId = @OrdID And ProcessSno = 4 And IsNull(SEMIFINISH,'S') = 'F' And GUID = @Guid
If @FActAmt = 0 
BEGIN
Insert into Temp_BudgetAndActual (Guid,slno ,ordid,deptid, ActualQty,ActualAmt,StageID,ProcessSno)
 Select @Guid, 3, X.OrdID, X.DeptID,Isnull (SUM(X.Qty),0 )As Qty ,Isnull (SUM( X.amt),0) As Amt, X.Id, 4 From

/*(Select TBR.OrdID ,MD.DeptID ,ISNULL(SUM(TBR.Mtr), 0) As Qty,Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then isnull(sum(TBR.NetAmount),0) ELSE 
 sum(TBR.Mtr * isnull(TBR.Rate,0)) END as amt,TBR.styleno,Mas_JobWrkComp.Id   FROM  Trs_Bills  TB  (nolock)   INNER JOIN  Trs_BillRate TBR  (nolock) ON TB.ID  = TBR.ID Inner Join SuppOrdMas On SuppOrdMas.OrdId = TBR.OrdID Inner Join SuppOrdStyleDtl on Sup
pOrdStyleDtl.SuppOrdId=SuppOrdMas.SuppOrdId And TBR.StyleNo=SuppOrdStyleDtl.StyleNo  Inner Join Trs_PcsGrn1 On Trs_PcsGrn1.SuppOrdId=SuppOrdMas.SuppOrdId And  TBR.Dept = Trs_PcsGrn1.TargetStageID Inner Join Mas_JobWrkComp on Mas_JobWrkComp.id = TBR.Dept i
nner join  Mas_Dept  MD  (nolock) ON Mas_JobWrkComp.DeptId = MD.Deptid  WHERE  TBR.OrdID  in (select id from fnSplitter(@OrdID)) AND  MD.outputtype in('P')  GROUP BY MD.DeptID,TBR.OrdID  ,TBR.styleno ,Mas_JobWrkComp.Id)X*/

(SELECT Z.OrdID,Z.DeptID,SUM(Z.Qty) As Qty ,SUM(Z.amt) As Amt,Z.styleno,Z.Id FROM
(Select Distinct TBR.OrdID ,MD.DeptID ,ISNULL((TBR.Mtr), 0) As Qty,Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/
@Reqd_TaxInPL='Y' then isnull((TBR.NetAmount),0) ELSE (TBR.Mtr * isnull(TBR.Rate,0)) END as amt,TBR.styleno,Mas_JobWrkComp.Id ,
TB.ID As BrId ,ColId,PanelID  FROM  Trs_Bills  TB  (nolock)   INNER JOIN  Trs_BillRate TBR  (nolock) ON TB.ID  = TBR.ID 
Inner Join SuppOrdMas On SuppOrdMas.OrdId = TBR.OrdID Inner Join SuppOrdStyleDtl on SuppOrdStyleDtl.SuppOrdId=
SuppOrdMas.SuppOrdId And TBR.StyleNo=SuppOrdStyleDtl.StyleNo  Inner Join Trs_PcsGrn1 On Trs_PcsGrn1.SuppOrdId=
SuppOrdMas.SuppOrdId And  TBR.Dept = Trs_PcsGrn1.TargetStageID And Trs_PcsGrn1.Invid = TB.ID  Inner Join Mas_JobWrkComp on 
Mas_JobWrkComp.id = TBR.Dept inner join  Mas_Dept  MD  (nolock) ON Mas_JobWrkComp.DeptId = MD.Deptid  WHERE  TBR.OrdID  in 
(select id from fnSplitter(@OrdID)) AND  MD.outputtype in('P') And Trs_PcsGrn1.GrnType = 'Supplier Order Receipt' )Z
  GROUP BY Z.DeptID,Z.OrdID  ,Z.styleno ,Z.Id)X   Group By  X.OrdID, X.DeptID,X.Id
  END 
  ELSE
  BEGIN 
  --test

 Update Tmp Set Tmp.ActualQty = IsNull(Tmp.ActualQty,0) + Y.Qty, Tmp.ActualAmt = IsNull(Tmp.ActualAmt,0) + Y.Amt From (
 Select X.Ordid,X.DeptId,IsNull(SUM(X.Qty),0) As Qty,IsNull(SUM(X.Amt),0) As Amt,3 As SlNo,X.Id As StageId,4 As ProcessSno From
( SELECT Z.OrdID,Z.DeptID,SUM(Z.Qty) As Qty ,SUM(Z.amt) As Amt,Z.styleno,Z.Id FROM
(Select Distinct TBR.OrdID ,MD.DeptID ,ISNULL((TBR.Mtr), 0) As Qty,Case When 
/*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then isnull((TBR.NetAmount),0) ELSE 
(TBR.Mtr * isnull(TBR.Rate,0)) END as amt,TBR.styleno,Mas_JobWrkComp.Id ,TB.ID As BrId ,ColId,PanelID FROM  
Trs_Bills  TB  (nolock)   INNER JOIN  Trs_BillRate TBR  (nolock) ON TB.ID  = TBR.ID Inner Join SuppOrdMas On SuppOrdMas.OrdId = 
TBR.OrdID Inner Join SuppOrdStyleDtl on SuppOrdStyleDtl.SuppOrdId=SuppOrdMas.SuppOrdId And TBR.StyleNo=SuppOrdStyleDtl.StyleNo  
Inner Join Trs_PcsGrn1 On Trs_PcsGrn1.SuppOrdId=SuppOrdMas.SuppOrdId And  TBR.Dept = Trs_PcsGrn1.TargetStageID And 
Trs_PcsGrn1.Invid = TB.ID  Inner Join Mas_JobWrkComp on Mas_JobWrkComp.id = TBR.Dept inner join  Mas_Dept  MD  (nolock) ON
 Mas_JobWrkComp.DeptId = MD.Deptid  WHERE  TBR.OrdID  in (select id from fnSplitter(@OrdID)) AND  MD.outputtype in('P')  
 And Trs_PcsGrn1.GrnType = 'Supplier Order Receipt' )Z
 GROUP BY Z.DeptID,Z.OrdID  ,Z.styleno ,Z.Id)X GROUP BY X.OrdID,X.DeptID,X.Id ) Y Inner Join  Temp_BudgetAndActual Tmp On 
 Tmp.OrdId = Y.Ordid And Tmp.DeptId = Y.DeptID And Tmp.StageID = Y.StageId And Tmp.Slno = Y.SlNo Where Tmp.GUID = @Guid
  END

  /* Production Shift Wages */

   update b set b.actualamt=isnull(b.actualamt,0) + a.netamount from (select Y.ordid,StageId ,Sum(ShiftWages) as netamount 
   from Trs_ProdShiftWages Y INNER JOIN OrderMas ON Y.Ordid = OrderMas.Ordid Group by Y.ordid,StageId) a inner join 
   Temp_BudgetAndActual  b on a.ordid=b.ordid and a.StageId=b.StageID  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid 
   where    b.ordid in (select id from fnSplitter(@OrdID)) and slno=3     and b.guid=@guid
update b set b.actualamt=isnull(b.actualamt,0) + a.netamount from  (select Y.ordid,StageId ,Sum(ShiftWages) as netamount from 
Trs_ProdWages Y INNER JOIN OrderMas ON Y.Ordid = OrderMas.Ordid Group by Y.ordid,StageId) a    
inner join Temp_BudgetAndActual  b on a.ordid=b.ordid and a.StageId=b.StageID   where  b.ordid in 
(select id from fnSplitter(@OrdID)) and slno=3     and b.guid=@guid 
/* inner join MAs_dept as c(nolock)  on b.deptid=c.deptid */
/* For Dept Act.Bill Amount not in bud. Entry */     

 insert into Temp_BudgetAndActual     (  Guid,slno ,ordid  ,deptid  ,ActualQty     ,ActualAmt,Processsno)    
SELECT @Guid,1  ,TBR.OrdID ,TBR.dept ,ISNULL(SUM(TBR.Kgs), 0) ,SUM(TBR.Amount) ,
case When MD.OutputType in('Y','F') then 1 Else 2 END  FROM        Trs_Bills  TB  (nolock)  INNER JOIN Trs_BillRate TBR  (nolock)
 ON TB.ID = TBR.ID inner join Mas_Dept  MD  (nolock) ON TBR.dept=MD.Deptid  WHERE  TBR.OrdID  in 
 (select id from fnSplitter(@OrdID)) AND (TBR.dept  not in 
 ( Select Distinct Deptid from Temp_BudgetAndActual (nolock) where Deptid is not null )) And MD.outputtype in('Y','F','-')
  GROUP BY TBR.dept,TBR.OrdID  ,MD.outputtype  

 insert into Temp_BudgetAndActual  (  Guid,slno,ordid  ,deptid ,ActualQty    ,ActualAmt,Processsno  )     
SELECT @Guid,2  ,TBR.OrdID ,TBR.dept ,ISNULL(SUM(TBR.Mtr), 0),SUM(TBR.Amount) ,4    FROM  Trs_Bills  TB  (nolock)    
 INNER JOIN  Trs_BillRate TBR  (nolock) ON TB.ID  = TBR.ID  inner join  Mas_Dept  MD  (nolock) ON TBR.dept = MD.Deptid      
 WHERE      TBR.OrdID  in (select id from fnSplitter(@OrdID))  AND   TBR.dept  not in 
 ( Select Distinct Deptid from Temp_BudgetAndActual (nolock) where Deptid is not null ) And MD.outputtype in('P')     
GROUP BY TBR.dept,TBR.OrdID    

/*For Yarn ANd Fabric Sales and Job Wrk Invoice    
 'For separate yanr & fabric*/    
 /*swetha  28-10-2023*/
/* IF @Reqd_TaxInPL='Y'
BEGIN
 ;with   cte(      Guid,Slno,ordid  ,DeptID ,ActQty      ,ActAmt          ) as      (    Select @Guid,1,X.OrdId,X.Prs_Dept,sum(isnull(X.Qty,0)),sum(isnull(X.Amount,0)+isnull(tcsamt,0)) From (Select x1.OrdID,Prs_Dept,Sum(x1.Qty) as Qty,sum(amount) amount,(
Select isNull(SUM(Amount),0) Netamt From Trs_SalInvAddded WHERE AddDedCode =0 and id = x1.invid )   as tcsamt  From ( SELECT Trs_Del2.OrdID ,Prs_Dept,trs_del1.invid,isnull(SUM(Trs_Del2.kg),0) as Qty, isnull(SUM(Trs_Del2.kg * Trs_Del2.rate),0) + ((isnull(S
UM(Trs_Del2.kg * Trs_Del2.rate),0)) * isNull(SGStPer,0)/100) +  ((isnull(SUM(Trs_Del2.kg * Trs_Del2.rate),0)) * isNull(CGStPer,0)/100)  +  ((isnull(SUM(Trs_Del2.kg * Trs_Del2.rate),0) )* isNull(IGStPer,0)/100) AS Amount FROM Trs_Del1 INNER JOIN Trs_Del2 O
N Trs_Del1.ID = Trs_Del2.ID  INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID INNER JOIN Trs_Del4 ON Trs_Del2.Id = Trs_Del4.DcID And Trs_DEl2.StockID = Trs_Del4.StockID  INNER JOIN (Select id,isNull(SUM(Amount),0) Netamt From Trs_SalInvAddde
d WHERE AddDedCode =2 Group by ID) Trs_SalInvAddded ON Trs_Del1.InvId = Trs_SalInvAddded.ID   WHERE ISNULL(Trs_Del1.InvId, 0) <> 0 AND Trs_Del2.OrdID in (select id from fnSplitter(@OrdID)) And Trs_Del1.YF in ('Y') Group By Trs_Del2.OrdID,Prs_Dept,trs_del1
.invid,isNull(IGStPer,0),isNull(CGStPer,0),isNull(SGStPer,0) ) x1 group by invid,x1.OrdID,Prs_Dept   UNION Select x1.OrdID ,x1.Prs_Dept,sum(x1.Qty) As Qty, sum(amount) amount,(Select isNull(SUM(Amount),0) Netamt From Trs_SalInvAddded WHERE AddDedCode =0 a
nd id = x1.invid )   as tcsamt  From ( SELECT Trs_Del2.OrdID,Prs_Dept,trs_del1.invid,CASE WHEN Mas_Uom.Uom = 'KGS' Then isnull(SUM(Trs_Del2.kg),0) ELSE isnull(SUM(Trs_Del2.mtr),0) END as Qty, Case when Mas_UOM.UOM ='KGS' then isnull(SUM(Trs_Del2.kg * Trs_
Del2.rate),0) + ((isnull(SUM(Trs_Del2.kg * Trs_Del2.rate),0)) * isNull(Trs_Del4.SGStPer,0)/100) +  ((isnull(SUM(Trs_Del2.kg * Trs_Del2.rate),0)) * isNull(Trs_Del4.CGStPer,0)/100)  +  ((isnull(SUM(Trs_Del2.kg * Trs_Del2.rate),0) )* isNull(Trs_Del4.IGStPer,
0)/100) ELSE isnull(SUM(Trs_Del2.mtr * Trs_Del2.rate),0) + ((isnull(SUM(Trs_Del2.mtr * Trs_Del2.rate),0)) * isNull(Trs_Del4.SGStPer,0)/100) +  ((isnull(SUM(Trs_Del2.mtr * Trs_Del2.rate),0)) * isNull(Trs_Del4.CGStPer,0)/100)  +  ((isnull(SUM(Trs_Del2.mtr *
 Trs_Del2.rate),0) )* isNull(Trs_Del4.IGStPer,0)/100)  END AS Amount FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID  INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID   INNER JOIN Pro_ReqKnitt2 ON Pro_ReqKnitt2.OrdId = Trs_Del
2.OrdId AND StockTable.Dept = Pro_ReqKnitt2.DeptId AND Pro_ReqKnitt2.FabId = StockTable.FabID AND Pro_ReqKnitt2.CntID = StockTable.CntID AND Pro_ReqKnitt2.ColId = StockTable.ColID AND Pro_ReqKnitt2.DiaID = StockTable.DiaID AND Pro_ReqKnitt2.FinDiaId = Sto
ckTable.FinDiaID AND Pro_ReqKnitt2.SubPrsID = StockTable.SubPrsID AND StockTable.PRINT_DESIGNID = Pro_ReqKnitt2.DesignID LEFT JOIN Mas_Uom ON Pro_ReqKnitt2.RateUOM = Mas_Uom.UomID  INNER JOIN Trs_Del4 ON Trs_Del2.Id = Trs_Del4.DcID And Trs_DEl2.StockID = 
Trs_Del4.StockID  INNER JOIN (Select id,isNull(SUM(Amount),0) Netamt From Trs_SalInvAddded WHERE AddDedCode =2 Group by ID) Trs_SalInvAddded ON Trs_Del1.InvId = Trs_SalInvAddded.ID   WHERE ISNULL(Trs_Del1.InvId, 0) <> 0 AND Trs_Del2.OrdID in (select id fr
om fnSplitter(@OrdID)) And Trs_Del1.YF in ('F') Group By Trs_Del2.OrdID,Prs_Dept,Mas_uom.Uom,trs_del1.invid,isNull(Trs_Del4.IGStPer,0),isNull(Trs_Del4.CGStPer,0),isNull(Trs_Del4.SGStPer,0) ) x1 group by invid,x1.OrdID ,x1.Prs_Dept  ) X GROUP BY x.OrdId,x.
Prs_Dept      )   
update tmp     set  ActualQty  = isnull(ActualQty,0) - ActQty,    ActualAmt  = isnull(ActualAmt,0) - ActAmt    From Temp_BudgetAndActual tmp     join cte      on  tmp.ordid  = cte.ordid    and  tmp.Deptid  = cte.Deptid  and  tmp.Slno  = cte.Slno    wh
ere tmp.guid  = @guid     
END
ELSE
BEGIN
 ;with   cte(      Guid,Slno,ordid  ,DeptID ,ActQty      ,ActAmt          ) as      ( SELECT @Guid,1,X.OrdId,X.Prs_Dept,ISNULL(SUM(X.Qty),0),ISNULL(SUM(X.Amount),0) FROM(SELECT Trs_Del2.OrdId,Prs_Dept,Trs_Del1.InvId,isnull(sum(Trs_Del2.Kg),0) AS Qty, isnu
ll(SUM(Trs_Del2.Kg * Trs_Del2.rate),0) AS Amount FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.StockID   WHERE ISNULL(Trs_Del1.InvId, 0) <> 0 AND Trs_Del2.OrdID in (select id from fnS
plitter(@OrdID)) And Trs_Del1.YF in ('Y') Group By Trs_Del2.OrdId,Prs_Dept,Trs_Del1.InvId UNION SELECT Trs_Del2.OrdId,Prs_Dept,Trs_Del1.InvId,CASE WHEN Mas_Uom.Uom = 'KGS' THEN isnull(sum(Trs_Del2.Kg),0) ELSE isnull(sum(Trs_Del2.mtr),0) END AS Qty, CASE W
HEN Mas_Uom.Uom='KGS' Then isnull(SUM(Trs_Del2.Kg * Trs_Del2.rate),0) ELSE isnull(SUM(Trs_Del2.mtr * Trs_Del2.rate),0) END AS Amount FROM Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN StockTable ON Trs_Del2.StockID = StockTable.Stoc
kID  INNER JOIN Pro_ReqKnitt2 ON Pro_ReqKnitt2.OrdId = Trs_Del2.OrdId AND StockTable.Dept = Pro_ReqKnitt2.DeptId AND Pro_ReqKnitt2.FabId = StockTable.FabID AND Pro_ReqKnitt2.CntID = StockTable.CntID AND Pro_ReqKnitt2.ColId = StockTable.ColID AND Pro_ReqKn
itt2.DiaID = StockTable.DiaID AND Pro_ReqKnitt2.FinDiaId = StockTable.FinDiaID AND Pro_ReqKnitt2.SubPrsID = StockTable.SubPrsID  AND StockTable.PRINT_DESIGNID = Pro_ReqKnitt2.DesignID LEFT JOIN Mas_Uom ON Pro_ReqKnitt2.RateUOM = Mas_Uom.UomID WHERE ISNULL
(Trs_Del1.InvId, 0) <> 0 AND Trs_Del2.OrdID in (select id from fnSplitter(@OrdID)) And Trs_Del1.YF in ('F') Group By Trs_Del2.OrdId,Prs_Dept,Trs_Del1.InvId,Mas_Uom.Uom) X GROUP BY X.OrdId,X.Prs_Dept)
 update tmp     set  ActualQty  = isnull(ActualQty,0) - ActQty,    ActualAmt  = isnull(ActualAmt,0) - ActAmt    From Temp_BudgetAndActual tmp     join cte      on  tmp.ordid  = cte.ordid    and  tmp.Deptid  = cte.Deptid  and  tmp.Slno  = cte.Slno    where
 tmp.guid  = @guid  
END */

 ;with   cte(     Guid,Slno,ordid    ,DeptID ,ActQty      ,ActAmt          ) as      (      Select  @Guid,2  ,Trs_Pcs1.Ordjobno ,
 Dept ,ISNULL(SUM(Trs_Pcs2.Pcs),0), ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)     FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID      WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 AND Trs_Pcs1.Ordjobno  in 
 (select id from fnSplitter(@OrdID))      Group by Dept,Trs_Pcs1.Ordjobno    )    

 update tmp     set  ActualQty  = isnull(ActualQty,0) - ActQty,     ActualAmt  = isnull(ActualAmt,0) - ActAmt   From 
 Temp_BudgetAndActual tmp      join cte      on  tmp.ordid  = cte.ordid    and  tmp.Deptid  = cte.Deptid    and  
 tmp.Slno  = cte.Slno     where tmp.guid  = @guid     

Set Nocount off     
end --B0
















