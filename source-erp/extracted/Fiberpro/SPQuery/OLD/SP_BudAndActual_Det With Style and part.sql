
/*    
;=============================================    
; Author   :  Global Software's    
; Create date  :  21/11/2013    
; Create By   :  DHARANI A    
; Description  :  Budget Vs Actual Detail     
; Change Person  :  ASLAM     
; Last Change Date :  26/08/2014 12.23 PM
; =============================================     
drop table Temp_BudgetAndActual_Det    
create table Temp_BudgetAndActual_Det(Guid varchar(256),Slno int,Type varchar(50),Ordid int,Deptid int,Deptname varchar(50),fabid int,cntid int,    
Acctypeid int,Accdesc int, sizedesc int,colorid int,styleno varchar(20),comid int,BudgetQty numeric(18,3),BudgetAmt numeric(18,2),ActualQty numeric(18,3),ActualAmt numeric(18,2))    
    
create table Temp_BudgetAndActual_Det(Guid varchar(256),Slno int,Type varchar(50),Ordid int,Deptid int,Deptname varchar(50),fabid int,cntid int,    
Acctypeid int,Accdesc int, sizedesc int,colorid int,styleno varchar(20),comid int,BudgetQty numeric(18,3),BudgetAmt numeric(18,2),ActualQty numeric(18,3),ActualAmt numeric(18,2))    
*/    
CREATE Procedure SP_BudAndActual_Det (@Guid as varchar(256), @Ordid as int,@OverHeads as numeric(18,3),@currency as numeric(9,3),@Buyercomm as numeric(9,3),@DDB as decimal(5,2) ,@GblCode int)    
as    
    
begin    
set nocount on    
declare @Sno int,    
        @heading varchar(50),    
        @Salerate numeric(18,3),    
        @OrdQty int,    
  @OrdExsQty int,    
  @DespatchQty decimal(9,0)    
    
/* ---yarn details */    
    
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid ,BudgetQty,BudgetAmt )    
 select @guid,1,'YARN DETAILS',@ordid,pro_reqyarn2.deptid,deptname,'' as fabid,pro_reqyarn2.countid,pro_reqyarn2.colid ,Sum(pro_reqyarn.Reqkgs) as qty    
  ,Sum(pro_reqyarn.Reqkgs * pro_reqyarn2.Rate) as amt from pro_reqyarn2(nolock) inner join MAs_dept(nolock) on pro_reqyarn2.deptid=Mas_dept.deptid inner join  pro_reqyarn (nolock) on pro_reqyarn2.ordid=pro_reqyarn.ordid and pro_reqyarn2.deptid=  
  pro_reqyarn.deptid and pro_reqyarn2.countid=pro_reqyarn.countid  and pro_reqyarn2.colid=pro_reqyarn.colid     where pro_reqyarn2.ordid=@ordid and OutputType ='Y'    
  Group By pro_reqyarn2.deptid,deptname,pro_reqyarn2.countid,pro_reqyarn2.colid
    
    
update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from     
(select ordid,dept,cntid,ColId,sum(kgs) as kgs,sum(netamount) as netamount from trs_billrate group by ordid,dept,ColId,cntid ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid    
inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='Y'     



 /*--update opening stock information */    
update b set b.ActualQty= isnull(b.ActualQty,0)+a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     
(select trs_opening.ordid,trs_opening.dept,cntid,ColId,sum(kgs) as kgs,sum(kgs*trs_opening.rate) as netamount from trs_opening inner join stocktable on trs_opening.stockid= stocktable.stockid group by trs_opening.ordid,trs_opening.dept,ColId,cntid ) a    
inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='Y'    
    
    
/*--update transfer In kgs*/    
update b set b.ActualQty= isnull(b.ActualQty,0)+a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     
(select trs_del2.tranordid as ordid,trs_Del1.Prs_dept,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid where trtype=3 and trs_del2.Tranordid=@Ordid  group by trs_del2.tranordid,trs_Del1.Prs_dept,ColId,cntid ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='Y'    
    
    
/*--update transfer out kgs*/    
update b set b.ActualQty= isnull(b.ActualQty,0)-a.kgs ,b.actualamt=isnull(b.actualamt,0)-a.netamount from     
(select trs_del2.ordid as ordid,trs_Del1.Prs_dept,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid where trtype=3 and trs_del2.ordid=@Ordid group by trs_del2.ordid,trs_Del1.Prs_dept,ColId,cntid ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='Y'    
    
    
    
/*--Fabric except  MAs_dept.RateMethod ='Color' */    
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid ,BudgetQty,BudgetAmt )    
     
select @guid,2,'FABRIC DETAILS',@ordid,Pro_ReqKnitt2.deptid,deptname, Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,Pro_ReqKnitt2.colid ,SUM(CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) as budgetqty,    
SUM((CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) * (ISNULL(dbo.Pro_ReqKnitt2.Rate, 0)  + ISNULL(dbo.Pro_ReqKnitt2.AddRate, 0))) AS Amount from pro_reqknitt2(nolock) inner join MAs_dept(nolock) on   pro_reqknitt2.deptid=Mas_dept.deptid     INNER JOIN dbo.Pro_ReqKnitt(nolock) ON dbo.Pro_ReqKnitt.OrdId = dbo.Pro_ReqKnitt2.OrdId AND dbo.Pro_ReqKnitt.DeptId = dbo.Pro_ReqKnitt2.DeptId AND  dbo.Pro_ReqKnitt.FabId = dbo.Pro_ReqKnitt2.FabId AND dbo.Pro_ReqKnitt.ColId = dbo.Pro_ReqKnitt2.ColId AND    dbo.Pro_ReqKnitt.CntID = dbo.Pro_ReqKnitt2.CntID AND dbo.Pro_ReqKnitt.GSM = dbo.Pro_ReqKnitt2.GSM AND  dbo.Pro_ReqKnitt.GG = dbo.Pro_ReqKnitt2.GG AND dbo.Pro_ReqKnitt.LL = dbo.Pro_ReqKnitt2.LL AND  dbo.Pro_ReqKnitt.DiaID = dbo.Pro_ReqKnitt2.DiaID   and dbo.Pro_ReqKnitt.FinDiaID = dbo.Pro_ReqKnitt2.FinDiaID LEFT OUTER JOIN Mas_UOM as Mas_UOM_1 ON Pro_ReqKnitt2.RateUOM = Mas_UOM_1.UOMID      
    where Pro_ReqKnitt2.ordid=@ordid and OutputType ='F' and MAs_dept.RateMethod <>'Colour' group by Pro_ReqKnitt2.deptid,deptname, Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,Pro_ReqKnitt2.colid      
    

/*Here   For Actual Kgs -> Only Process Kgs only to be update 
 --KGS  updation */
 update b set b.ActualQty= a.kgs  from     
(select ordid,Y.dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(Y.netamount) as netamount from trs_Bills X INNER JOIN trs_billrate Y ON X.ID = Y.ID Where X.BillType in ('Purchase','Process')group by ordid,Y.dept,ColId,fabid,cntid,BillType ) a     
 inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and   
 c.RateMethod <>'Color'  
 
 /*Amount updation -- Here   For Actual Amount -> Only Process and Reprocess Amount to be update */
 
 update b set b.actualamt=a.netamount  from     
(select ordid,dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(netamount) as netamount from trs_billrate group by ordid,dept,ColId,fabid,cntid ) a     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and    c.RateMethod <>'Color'    
 
 
    
 /*--update openignstock*/    
 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt= isnull( b.actualamt,0) + netamount from     
(select trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(kgs*trs_opening.rate) as netamount from trs_opening inner join stocktable on trs_opening.stockid=stocktable.stockid  group by trs_opening.ordid,trs_opening.dept,ColId,fabid,cntid ) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and c.RateMethod <>'Color'    
    
     
 /*--update TransferIn kgs*/    
 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt= isnull( b.actualamt,0) + netamount from     
(select trs_del2.tranordid as ordid,trs_del1.prs_dept ,fabid,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid where trtype=3 and trs_del2.tranordid=@Ordid  group by trs_del2.tranordid,trs_del1.Prs_dept,ColId,fabid,cntid ) a inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.Prs_dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and c.RateMethod <>'Color'    
    
  /*--update Transferout kgs*/    
 update b set b.ActualQty= isnull(b.ActualQty,0)- a.kgs ,b.actualamt= isnull( b.actualamt,0) - netamount from     
(select trs_del2.ordid as ordid,trs_del1.prs_dept ,fabid,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid where trtype=3 and trs_del2.ordid=@Ordid group by trs_del2.ordid,trs_del1.Prs_dept,ColId,fabid,cntid ) a    
 inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.Prs_dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'     
 and c.RateMethod <>'Color'    
    
    
    
/*--Fabric except  MAs_dept.RateMethod <> 'Color' */    

 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid  ,BudgetQty,BudgetAmt )    
select @guid,2,'FABRIC DETAILS',@ordid,Pro_ReqKnitt2.deptid,deptname,Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,Pro_ReqKnitt2.colid  ,SUM(CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) as budgetqty,  SUM((CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) * (ISNULL(dbo.Pro_ReqKnitt2.Rate, 0)  + ISNULL(dbo.Pro_ReqKnitt2.AddRate, 0))) AS Amount from pro_reqknitt2(nolock) inner join MAs_dept(nolock) on pro_reqknitt2.deptid=Mas_dept.deptid     INNER JOIN dbo.Pro_ReqKnitt(nolock) ON dbo.Pro_ReqKnitt.OrdId = dbo.Pro_ReqKnitt2.OrdId AND dbo.Pro_ReqKnitt.DeptId = dbo.Pro_ReqKnitt2.DeptId AND  dbo.Pro_ReqKnitt.FabId = dbo.Pro_ReqKnitt2.FabId AND dbo.Pro_ReqKnitt.ColId = dbo.Pro_ReqKnitt2.ColId AND    dbo.Pro_ReqKnitt.CntID = dbo.Pro_ReqKnitt2.CntID AND dbo.Pro_ReqKnitt.GSM = dbo.Pro_ReqKnitt2.GSM AND  dbo.Pro_ReqKnitt.GG = dbo.Pro_ReqKnitt2.GG AND dbo.Pro_ReqKnitt.LL = dbo.Pro_ReqKnitt2.LL AND  dbo.Pro_ReqKnitt.DiaID = dbo.Pro_ReqKnitt2.DiaID    and dbo.Pro_ReqKnitt.FinDiaID = dbo.Pro_ReqKnitt2.FinDiaID LEFT OUTER JOIN Mas_UOM as Mas_UOM_1 ON Pro_ReqKnitt2.RateUOM = Mas_UOM_1.UOMID         where Pro_ReqKnitt.ordid=@ordid and OutputType ='F' and MAs_dept.RateMethod ='Colour' group by Pro_ReqKnitt2.deptid,deptname,Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,Pro_ReqKnitt2.colid 


    
    
update b set b.ActualQty= a.kgs  ,b.actualamt=a.netamount from    
(select ordid,dept,ColId,sum(kgs) as kgs,sum(netamount) as netamount from trs_billrate group by ordid,dept,ColId) a      inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid  and a.ColId =b.colorid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and c.RateMethod ='Colour'    
    
  /* --update opening stock*/    
  
    
  update b set b.ActualQty=  b.ActualQty+a.kgs  ,b.actualamt=isnull(b.actualamt,0) + a.netamount from    
(select trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(kgs *trs_opening.rate) as netamount from trs_opening inner join stocktable on trs_opening.stockid= stocktable.stockid  group by trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId) a    
  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid   and a.ColId =b.colorid    inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and c.RateMethod ='Colour'    
    
      
 /* --update transfer in kgs*/    
 
  update b set b.ActualQty=  b.ActualQty+a.kgs  ,b.actualamt=isnull(b.actualamt,0) + a.netamount from    
(select trs_del2.tranordid as ordid,trs_del1.prs_dept,fabid,cntid,ColId,sum(kg) as kgs,sum(trs_del2.kg *trs_del2.rate) as netamount from trs_del1 inner join trs_del2 on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid where trtype=3 and trs_del2.tranordid=@Ordid   group by trs_del2.tranordid,trs_del1.prs_dept,fabid,cntid,ColId) a    
  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid   and a.cntid=b.cntid  and a.fabid=b.fabid   and a.ColId =b.colorid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and c.RateMethod ='Colour'    
    
        
  /*--update transfer out kgs*/    
  
  
  update b set b.ActualQty=  b.ActualQty-a.kgs  ,b.actualamt=isnull(b.actualamt,0) - a.netamount from    
(select trs_del2.ordid as ordid,trs_del1.prs_dept,fabid,cntid,ColId,sum(kg) as kgs,sum(trs_del2.kg *trs_del2.rate) as netamount from trs_del1 inner join trs_del2 on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid where trtype=3 
  
and trs_del2.ordid=@Ordid   group by trs_del2.ordid,trs_del1.prs_dept,fabid,cntid,ColId) a    
  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid   and a.cntid=b.cntid  and a.fabid=b.fabid   and a.ColId =b.colorid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and OutputType ='F'   and c.RateMethod ='Colour'    
    
    
    
/* -- Accessories information */    

 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,Acctypeid ,Accdesc,colorid,sizedesc ,BudgetQty,BudgetAmt )    
select @guid,3,'ACCESSORY DETAILS',@Ordid,Pro_AccBudRate.prsid,deptname,Pro_AccBudRate.Acc_Type ,Pro_AccBudRate.Acc_Desc ,Pro_AccBudRate.Clr ,Pro_AccBudRate.Siz, SUM(dbo.PRO_AccReq.ReqdQty) AS reqqty , 
SUM(dbo.PRO_AccReq.ReqdQty * (ISNULL(dbo.Pro_AccBudRate.BudRate, 0) + ISNULL(dbo.Pro_AccBudRate.AddRate, 0))) AS amount FROM dbo.PRO_AccReq INNER JOIN dbo.Pro_AccBudRate ON dbo.PRO_AccReq.OrdID = dbo.Pro_AccBudRate.OrdID AND dbo.PRO_AccReq.Acc_Type = dbo.Pro_AccBudRate.Acc_Type AND dbo.PRO_AccReq.Acc_Desc = dbo.Pro_AccBudRate.Acc_Desc AND dbo.PRO_AccReq.Clr = dbo.Pro_AccBudRate.Clr AND dbo.PRO_AccReq.Siz = dbo.Pro_AccBudRate.Siz  inner join Mas_dept on Pro_AccBudRate.prsid=MAs_dept.deptid    INNER JOIN ORderMas ON dbo.PRO_AccReq.Ordid = OrderMas.Ordid 
 where pro_accreq.ordid=@ordid and Mas_dept.RateMethod ='-'    
  group by Pro_AccBudRate.prsid,deptname,Pro_AccBudRate.Acc_Type ,Pro_AccBudRate.Acc_Desc ,Pro_AccBudRate.Clr ,Pro_AccBudRate.Siz
    
  update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from     
  (select trs_billrate.ordid,dept,atype,Ades,ColId,Asiz,sum(kgs)  as Kgs,sum(netamount) as NetAmount 
  from trs_billrate 
   INNER JOIN OrderMas ON trs_billrate.Ordid = OrderMas.Ordid 
  group by trs_billrate.ordid,dept,atype,Ades,ColId,Asiz,OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)) a    
     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.atype=b.Acctypeid   and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.Asiz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid and guid=@guid    
  
 /* --Opening stock*/    
  update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     
  (select trs_opening.ordid,trs_opening.dept,atype,Ades,ColId,siz,sum(kgs) as kgs,sum(kgs*trs_opening.rate) as netamount from trs_opening(nolock) inner join stocktable(nolock) on trs_opening.stockid=stocktable.stockid  group by trs_opening.ordid,  
  trs_opening.dept,atype,Ades,ColId,siz) a    
     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.atype=b.Acctypeid   and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid  and guid=@guid    
    
    
  /*--update tranfer in  kgs*/    
    
  update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     
  (select trs_del2.tranordid as ordid,trs_del1.prs_dept,atype,Ades,ColId,siz,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from trs_del1 (nolock) inner join trs_del2 on trs_del1.id=trs_del2.id    inner join stocktable(nolock) on trs_del2.stockid=  
  stocktable.stockid where trtype=8 and trs_del2.tranordid=@Ordid  group by trs_del2.tranordid,trs_del1.prs_dept,atype,Ades,ColId,siz) a   
     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.atype=b.Acctypeid   and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid  and guid=@guid    
    
  /* --update tranfer out  kgs*/    
    
  update b set b.ActualQty= isnull(b.ActualQty,0)- a.kgs ,b.actualamt=isnull(b.actualamt,0)-a.netamount from     
  (select trs_del2.ordid as ordid,trs_del1.prs_dept,atype,Ades,ColId,siz,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from trs_del1 (nolock) inner join trs_del2 on trs_del1.id=trs_del2.id    inner join stocktable(nolock) on trs_del2.stockid=stocktable.stockid where trtype=8 and trs_del2.ordid=@Ordid  group by trs_del2.ordid,trs_del1.prs_dept,atype,Ades,ColId,siz) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.atype=b.Acctypeid   and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ordid  and guid=@guid    
    
    
 /*-- Inhouse production*/    
     if @gblcode<>123 
     BEgin
insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,budgetamt )    
    select @guid,4,'INHOUSE PRODUCTION',ordid,wrkid, WorkComplDet ,styleno ,Rate from Trs_ProdExp inner join Mas_JobWrkComp (nolock) on Trs_ProdExp.wrkid=Mas_JobWrkComp.id  where rate>0 and Ordid=@Ordid    
   /* --budget qty*/    
      update a set a.BudgetQty =x.budgetqty ,a.BudgetAmt = a.BudgetAmt*x.budgetqty  from     
    (select ordid,styleno,sum(OrderQtyDtl .CutPlanQty ) as budgetqty from orderqtydtl where ordid=@Ordid group by ordid,styleno) x     
  inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno where type='INHOUSE PRODUCTION'    
    
 /* --actual amt*/    
  update a set a.actualqty =x.Pcs ,a.actualAmt = X.amount from    
     ( select ordid,styleno,stageid,sum(Trs_ProdentryQty.ProdPcs) as Pcs , sum(Trs_ProdentryQty.ProdPcs * isnull(Rate,0)) as amount from Trs_Prodentry inner join Trs_ProdentryQty on Trs_Prodentry.id=Trs_ProdentryQty .id  inner join  Trs_ProdBill on  Trs_ProdBill.id=Trs_Prodentry.brid where ordid= @Ordid group by ordid,styleno,stageid  )x    
   inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno and x.stageid= a.deptid where type='INHOUSE PRODUCTION'    
  END
 /* --Piece form Details*/    
 
     insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,BudgetQty,BudgetAmt )    
  select @guid,5,'PCS FORM', Pro_ProdPros.ordid ,ProdPros,deptname,Pro_ProdPros.styleno,sum(qty)  as qty,
   sum(Qty*rate) as Amt  
   from Pro_ProdPros inner join MAs_dept (nolock) on Pro_ProdPros.ProdPros  =MAs_dept.DeptID  
  INNER JOIN OrderMas ON Pro_ProdPros.Ordid = OrderMas.Ordid 
  where Pro_ProdPros.ordid=@ORdid and  rate >0 group by Pro_ProdPros.ordid ,ProdPros,  
deptname,Pro_ProdPros.styleno,Ordermas.EntryOption,IsNUll(OrderMas.PcePerPack,1)    
    
    update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from     
    (select ordid,dept,styleno,sum(mtr) as kgs,sum(netamount) as netamount from trs_billrate group by ordid,dept,styleno) a    
     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.styleno=b.styleno  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where               b.ordid=@ordid and slno=5    
    
     
   ----aslam update 
   /*
    Declare @InHouseDataCount as integer
    Select @InHouseDataCount =Count(*) from Temp_BudgetAndActual_Det  Where Type='INHOUSE PRODUCTION'
    if @InHouseDataCount =0 
    Begin 
    update a set a.actualqty =x.Pcs ,a.actualAmt = X.amount from    
     ( select ordid,styleno,stageid,sum(Trs_ProdentryQty.ProdPcs) as Pcs , sum(Trs_ProdentryQty.ProdPcs * isnull(Rate,0)) as amount from Trs_Prodentry inner join Trs_ProdentryQty on Trs_Prodentry.id=Trs_ProdentryQty .id  inner join  Trs_ProdBill on  Trs_ProdBill.id=Trs_Prodentry.brid where ordid= @Ordid group by ordid,styleno,stageid  )x    
   inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno
   INNER JOIN Mas_JobWrkComp c on X.StageID = c.ID  and c.DeptID= a.deptid where type='PCS FORM'       
   end 
   -------aslam */
   
   if @gblcode=123 
   Begin
       update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from     
    (select Y.ordid,departmentid as Dept,Y.styleno,
    IsNull(Sum(Y.ProdPcs),0) as kgs,
     sum(Wages) as netamount      
      from Wages_ProductionMas X INNER JOIN Wages_ProductionDet Y ON X.MasSlno = Y.DetSlno 
    INNER JOIN OrderMas ON Y.Ordid = OrderMas.OrdID 
    group by Y.ordid,departmentID,Y.styleno,Ordermas.EntryOption,IsNull(Ordermas.PcePerPack,1)) a    
     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.styleno=b.styleno  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid Where  b.ordid=@ordid and slno=5    
   End
    
 /* --update commercial Details*/    
  Select @OrdQty= isnull(sum(orderqtydtl.orderqty),0)  from orderqtydtl INNER JOIN OrderMas ON OrderQtyDtl.Ordid = OrderMas.Ordid   Where OrderMas.ordid=@Ordid      Group By Ordermas.EntryOption,  IsNull(OrderMas.PcePerPack,1)
 
   Select @OrdExsQty = isnull(sum(CutPlanQty ),0) From orderqtydtl INNER JOIN OrderMas ON OrderQtyDtl.Ordid = OrderMas.Ordid where OrderMas.ordid=@Ordid    Group By Ordermas.EntryOption,  IsNull(OrderMas.PcePerPack,1)
    
  
 select @Salerate =ISNULL(Sum(OrderQtyDtl.OrderQty * SaleRate * isnull(Crate,0)),0)  from OrderMas(nolock) Inner Join OrderQtyDtl(nolock) on OrderMas.OrdId = OrderQtyDtl.OrdID    Where OrderMas.Ordid=@ordid    
    
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,comid,BudgetQty,BudgetAmt )    
 select @guid,6,'COMMERCIAL DETAILS',ordid,-2,'COMMERCIAL',comid ,@OrdExsQty,case when pers_perpcs='%' then (@salerate *per/100)    
 else  case when pers_perpcs='P' then  @OrdExsQty*Val else   case when pers_perpcs ='D' then Total  end  end     end as BudgetAmt   from PRo_BudCommercial INNER JOIN                dbo.Mas_Commercial ON dbo.PRo_BudCommercial.ComID = dbo.Mas_Commercial.ID    
 where ordid=@Ordid    
    
 update a set a.Actualamt=  x.billamt     
 from     
 (select ShippingBill_det.ordid ,comid ,
 sum(BillAmount) as billamt  from ShippingBill (nolock) inner join ShippingBill_det(nolock) on ShippingBill.id =ShippingBill_det.cid   
 INNER JOIN ORderMas ON ShippingBill_det.ordid = OrderMas.OrdId 
 where ShippingBill_det.ordid=@ordid group by ShippingBill_det.ordid ,comid,OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) )x inner join Temp_BudgetAndActual_Det a on x.ordid=a.ordid and x.comid=a.comid  where a.ordid=@Ordid and guid=@guid    
 
 /*--Update Despatch qty as actual qty in commercial*/    
 
 SELECT @Despatchqty=    
  ISNULL(SUM(Trs_Pcs2.Pcs), 0) FROM  Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND Trs_Pcs2.StyleID = OrderQtyDtl.StyleID WHERE     (OrderMas.OrdId = @ordid) AND (Trs_Pcs1.DelType = 'Despatch')    group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
    
 update Temp_BudgetAndActual_Det set ActualQty =@Despatchqty where ordid=@Ordid and guid=@guid and slno=6 and isnull(ActualQty ,0)=0    
    
  update a set Actualamt= isnull(Actualamt,0)+billamt from    
  (select  trs_expenses.ordid ,expid ,isnull(sum(Amount),0) as billamt  from trs_expenses  where trs_expenses.ordid=@Ordid  group by trs_expenses.ordid ,expid) x inner join Temp_BudgetAndActual_Det a on x.ordid=a.ordid and x.expid=a.comid  where a.ordid=   @ordid  and guid=@guid and billamt>0    
    
 /*--taking from expenses entry*/    
   
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,comid,Actualamt)    
  (select @guid,6,'COMMERCIAL DETAILS', trs_expenses.ordid ,-2,'COMMERCIAL',expid ,sum(Amount) as billamt  from trs_expenses  where trs_expenses.ordid=@ordid and  expid not in(select distinct comid from Temp_BudgetAndActual_Det where Slno=6 and guid=@guid
  
) group by trs_expenses.ordid ,expid)   
    
     
    
 /*--Unplanned Process Bills entry*/    
    
 insert into Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid ,colorid ,Acctypeid ,Accdesc ,sizedesc ,ActualQty,ActualAmt)    
    
 select @guid, case when OutputType ='Y'  then 1  else  case when OutputType ='F' then 2  else  case when OutputType ='-' then 3 end  end end as Slno ,    
 case when OutputType ='Y'  then 'YARN DETAILS'   else  case when OutputType ='F' then 'FABRIC DETAILS'   else case when OutputType ='-' then 'ACCESSORY DETAILS' end end end as        type,    
  ordid,deptid,deptname ,fabid,Cntid ,ColId ,Atype ,ades ,Asiz ,trs_billrate.Kgs ,trs_billrate.netamount     
    from trS_billrate(nolock) inner join trs_bills (nolock) on trS_billrate.id=trs_bills.id  inner join MAs_dept (nolock) on trS_billrate.dept=MAs_dept.DeptID    
      where Ordid =@Ordid and type in ('YF','AC') and trs_billrate.dept not in (select deptid from Temp_BudgetAndActual_Det where ordid=@Ordid and guid=@Guid)    
    
    
    
   --Budget and Actual Abs information    
   Declare    
   @ExpSalesAct numeric(18,3),@ExpSalesbud numeric(18,3),    
   @ProcessBud numeric(18,3),    
     @ProcessAct numeric(18,3),    
     @ProdBud numeric(18,3),    
     @ProdAct numeric(18,3),    
      @BudProdOH  numeric(18,3) ,    
     @BudDDB numeric(18,3) ,    
    @BudComm numeric(18,3),    
      @Crate numeric(9,3),    
      @SalesCommBud numeric(18,3),@SalesCommAct numeric(18,3),    
    
      @DDBBud numeric(18,3), @DDBAct numeric(18,3),    
      @CommBud numeric(18,3),@CommAct numeric(18,3),  
      @FabricBudAmt Numeric(18,3),@FabricActAmt Numeric(18,3),  
      @AccBudAmt Numeric(18,3),@AccActAmt Numeric(18,3) ,   
      @PrdnBudAmt Numeric(18,3),@PrdnActAmt Numeric(18,3),      
      @OrderQtyWithExcess Numeric(18,2),@ShippedQty Numeric(18,2),
      @OrderQtyWithOutExcess Numeric(18,0),@TotalCutPcs Numeric(18,0),
      @InHouseCutPcs Numeric(18,0),@PceFormCutPcs Numeric(18,0),
      @OrderQty_FORSET Numeric(18,0),@ShippedQty_FORSET Numeric(18,0)
      
      Select @BudComm=isnull(Bud_Buycomm,0) , @BudDDB=isnull(Bud_ddb,0) ,@BudProdOH=isnull(ProdOverheads,0) , @Crate=isnull(crate,0)  from ordermas where ordid=@Ordid    
    
      Select @ExpSalesbud=       
       Case When OrderMas.EntryOption='2' And IsNull(OrderMas.PcePerPack,1) > 1 THEN ISNULL(Sum((OrderQtyDtl.OrderQty/IsNull(OrderMas.PcePerPack,1)) * SaleRate * isnull(Crate,0)),0)   ELSE 
      ISNULL(Sum(OrderQtyDtl.OrderQty * SaleRate * isnull(Crate,0)),0) END from OrderMas Inner Join OrderQtyDtl on OrderMas.OrdId = OrderQtyDtl.OrdID Where	         OrderMas.Ordid= @ordid  group by ORdermas.EntryOption,IsNUll(OrderMas.PcePerPack,1)   
    
/*   SELECT    @ExpSalesAct= ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs2.Rate * Case When IsNull(OrderMas.CRate,0) = 0 then ISNULL(Trs_Pcs2.Crate, 0)  Else OrderMas.ActCRate End ), 0)  FROM  Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND Trs_Pcs2.StyleID = OrderQtyDtl.StyleID WHERE     (OrderMas.OrdId = @Ordid ) AND (Trs_Pcs1.DelType = 'Despatch')   
As per Mr.Muthusamy sir instruction following query changed as Crate from Despatch table on 02-Jul-2014
 */
     
    SELECT    @ExpSalesAct= 
    Case When OrderMas.EntryOption='2' And IsNull(OrderMas.PcePerPack,1) > 1 THEN 
           ISNULL(SUM(Round(Trs_Pcs2.Pcs/IsNull(OrderMas.PcePerPack,1),0) * OrderQtyDtl.SaleRate * Case When IsNull(Trs_Pcs2.Crate,0) = 0 then ISNULL(OrderMas.CRate, 0) ELSE IsNull(Trs_Pcs2.Crate,0)  End ), 0)
           ELSE
        ISNULL(SUM(Trs_Pcs2.Pcs * OrderQtyDtl.SaleRate * Case When IsNull(Trs_Pcs2.Crate,0) = 0 then ISNULL(OrderMas.CRate, 0) ELSE IsNull(Trs_Pcs2.Crate,0)  End ), 0) END FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND Trs_Pcs2.StyleID = OrderQtyDtl.StyleID WHERE     (OrderMas.OrdId = @Ordid ) AND (Trs_Pcs1.DelType = 'Despatch')  group by ORdermas.EntryOption,IsNUll(OrderMas.PcePerPack,1) 
    
    --Case When OrderMas.EntryOption='2' And IsNull(OrderMas.PcePerPack,1) > 1 THEN 
    
    Select @OrderQty_FORSET = Case When OrderMas.EntryOption='2' And IsNull(OrderMas.PcePerPack,1) > 1 THEN (ISNULL(Sum(OrderQtyDtl.OrderQty),0) / IsNull(OrderMas.PcePerPack,1))     ELSE
      ISNULL(Sum(OrderQtyDtl.OrderQty),0) END  from OrderMas Inner Join OrderQtyDtl on OrderMas.OrdId = OrderQtyDtl.OrdID Where	         OrderMas.Ordid= @ordid Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
      
    
    Select @OrderQtyWithOutExcess=       
      ISNULL(Sum(OrderQtyDtl.OrderQty),0)  from OrderMas Inner Join OrderQtyDtl on OrderMas.OrdId = OrderQtyDtl.OrdID Where	         OrderMas.Ordid= @ordid
      
      Select @OrderQtyWithExcess=       
      ISNULL(Sum(OrderQtyDtl.CutPlanQty),0)  from OrderMas Inner Join OrderQtyDtl on OrderMas.OrdId = OrderQtyDtl.OrdID Where	         OrderMas.Ordid= @ordid
      
      
      SELECT    @InHouseCutPcs= 
        ISNULL(SUM(ProdPcs), 0) FROM  Trs_ProdEntry INNER JOIN  Trs_ProdEntryQty ON Trs_ProdEntry.ID = Trs_ProdEntryQty.ID  WHERE     (Trs_ProdEntry.OrdId = @Ordid ) AND (StageID=1)
      
      SELECT    @PceFormCutPcs= 
        ISNULL(SUM(Trs_Pcs2.Pcs), 0) FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID WHERE     (OrdJobNo = @Ordid ) AND (Trs_Pcs1.DelType = 'Process') and Dept =11
        
        SELECT @TotalCutPcs = @InHouseCutPcs + @PceFormCutPcs
        
      
      SELECT    @ShippedQty = 
        ISNULL(SUM(Trs_Pcs2.Pcs), 0) FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND Trs_Pcs2.StyleID = OrderQtyDtl.StyleID WHERE     (OrderMas.OrdId = @Ordid ) AND (Trs_Pcs1.DelType = 'Despatch')
      
      
            SELECT   @ShippedQty_FORSET= Case When OrderMas.EntryOption='2' And IsNull(OrderMas.PcePerPack,1) > 1 THEN 
            (ISNULL(SUM(Trs_Pcs2.Pcs), 0) / IsNull(OrderMas.PcePerPack,1))
             ELSE
        ISNULL(SUM(Trs_Pcs2.Pcs), 0) END FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND Trs_Pcs2.StyleID = OrderQtyDtl.StyleID WHERE     (OrderMas.OrdId = @Ordid ) AND (Trs_Pcs1.DelType = 'Despatch') GROUP BY OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
        
      
  /*  
     Select @ProcessBud =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (1,2)     /*,3,4,5*/
     Select @ProcessBud = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
     isnull(sum(BudgetAmt/IsNull(OrderMas.PcePerPack,1)),0) 
     ELSE
     isnull(sum(BudgetAmt),0) END from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid 
     Where slno in (3,4,5) group by     OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
    
 Select @ProcessAct = isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (1,2)    /*,3,4,5*/
 
  Select @ProcessAct = 
  CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
  isnull(sum(ActualAmt / IsNull(OrderMas.PcePerPack,1)),0)
  ELSE
  isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid  
  Where slno in (3,4,5)    Group by     OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
  
 
             Select @ProdBud = 
             CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
             isnull(sum(BudgetAmt/ IsNull(OrderMas.PcePerPack,1)),0)
             ELSE
             isnull(sum(BudgetAmt),0) END from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid     
             where slno in (4,5)    Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
             
             
             Select @ProdAct= 
             CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
             isnull(sum(ActualAmt/IsNull(OrderMas.PcePerPack,1)),0)
             ELSE
             isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid   
             where slno in (4,5)    Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
             
                              
      
    Select @FabricBudAmt =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (1,2)    
    Select @FabricActAmt = isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (1,2)   
    
    Select @AccBudAmt = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
    isnull(sum(BudgetAmt/IsNull(OrderMas.PcePerPack,1)),0) 
    ELSE
    isnull(sum(BudgetAmt),0) END     from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid   
    Where slno in (3)    Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
    
    Select @AccActAmt = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
    isnull(sum(ActualAmt / IsNull(OrderMas.PcePerPack,1)),0) 
    ELSE
    isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid   
    Where slno in (3)   Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)
    
    
    SELECT @PrdnBudAmt = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
    isnull(sum(BudgetAmt/IsNull(OrderMas.PcePerPack,1)),0)
    ELSE
    isnull(sum(BudgetAmt),0) END from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid    
    WHERE slno in (4,5) Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)   
    
    
    SELECT @PrdnActAmt= CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN 
    isnull(sum(ActualAmt/IsNull(OrderMas.PcePerPack,1)),0)
    ELSE
    isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid     
    WHERE slno in (4,5) Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1)      
      */
      
    select @ProcessBud =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (1,2,3,4,5)    
    
    select @ProcessAct = isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (1,2,3,4,5)    
    select @ProdBud =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (4,5)    
    select @ProdAct= isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (4,5)    
               
      
    select @FabricBudAmt =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (1,2)    
    select @FabricActAmt = isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (1,2)   
    select @AccBudAmt =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (3)    
    select @AccActAmt = isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (3)   
    select @PrdnBudAmt =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (4,5)    
    select @PrdnActAmt= isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (4,5)    
    
  select @ProdBud = (@BudProdOH / 100) * @ProdBud    
       select      @ProdAct = (@OverHeads / 100) * @ProdAct    
         select    @SalesCommBud = (@BudComm / 100) * @ExpSalesBud    
          select   @SalesCommAct = (@Buyercomm / 100) * @ExpSalesAct    
           select  @DDBBud = (@BudDDB / 100) * @ExpSalesBud    
     
 declare    
 @Income  numeric(18,3),    
 @Expence numeric(18,3)    
    
 select @DDBAct = (@DDB/ 100) * (@ExpSalesAct - @SalesCommAct)    
    
                 select @Income= isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and MAs_commercial.type='+'    
              select @Expence = isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det(nolock) inner join MAs_commercial(nolock) on Temp_BudgetAndActual_Det.comid=Mas_Commercial .id    where slno=6 and MAs_commercial.type='-'    
    
    select @CommBud = @Expence - @Income    
             select @Income = isnull(sum(ActualAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and MAs_commercial.type='+'    
    
            select @Expence =isnull(sum(ActualAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and Mas_Commercial.type='-'    
          select  @CommAct = @Expence - @Income    
    
    
    declare     
    @DebitValueAct numeric(18,3),    
    @Stockvalue numeric(18,3),    
    @dirdebval  numeric(18,3),    
    @dircreval  numeric(18,3)    
                    --Fabric     
             Select @DebitValueAct= Isnull(Sum(DebMtr * Trs_Deb2.Rate),0) From Trs_Deb1 Inner join Trs_Deb2 On Trs_Deb1.Id = Trs_Deb2.Id Inner Join StockTable On Trs_Deb2.StockID = StockTable.StockID Inner Join Mas_Fabric On StockTable.FabID =   
             Mas_Fabric.FabID Inner join Mas_Uom On Mas_Fabric.PriUomID = Mas_Uom.UomID Where (Typ = '1.Purchase' Or (Typ = '2.Process' AND Trs_Deb1.Dept = 4)) AND UOM <> 'KGS' AND StockTable.YF = 'F' AND Trs_Deb1.Ordid = @ordid    
    
           Select @DebitValueAct = @DebitValueAct + Isnull(Sum(DebKg * Trs_Deb2.Rate),0) From Trs_Deb1 Inner join Trs_Deb2 On Trs_Deb1.Id = Trs_Deb2.Id Inner Join StockTable On Trs_Deb2.StockID = StockTable.StockID Inner Join   
           Mas_Fabric On StockTable.FabID = Mas_Fabric.FabID Inner join Mas_Uom On Mas_Fabric.PriUomID = Mas_Uom.UomID Where (Not((Typ = '1.Purchase' Or (Typ = '2.Process' AND Trs_Deb1.Dept = 4))AND UOM <> 'KGS')) AND StockTable.YF = 'F'  AND  Trs_Deb1.Ordid = @OrdId    
           /* --yarn and acc*/    
    
             select @DebitValueAct = @DebitValueAct + (Isnull(Sum(DebKg * Trs_Deb2.Rate),0)) From Trs_Deb1 Inner join Trs_Deb2 On Trs_Deb1.Id = Trs_Deb2.Id Inner Join StockTable On Trs_Deb2.StockID = StockTable.StockID Where StockTable.YF <> 'F' AND   
             Trs_Deb1.Ordid = @ordid    
    
           Select  @DebitValueAct = @DebitValueAct + Isnull(Sum(DebQty * Rate),0) From Trs_Deb1 Inner Join Trs_Deb3 On Trs_Deb1.ID = Trs_Deb3.ID Where  Trs_Deb1.Ordid = @Ordid    
     /* stock value updated */    
            SELECT @Stockvalue= isnull(SUM(Vue_StockAbs.Kg * StockRate.Rate),0)  FROM Vue_StockAbs INNER JOIN StockTable ON Vue_StockAbs.StockID = StockTable.StockID INNER JOIN StockRate ON StockTable.StockID = StockRate.StockId INNER JOIN Mas_Dept ON StockTable.Dept = Mas_Dept.DeptID where StockRate.OrdId=@Ordid    
    
            Select @Stockvalue= @Stockvalue + ISNULL(SUM(Kg * Rate),0) from StockRate where StockRate.OrdId= @Ordid  and (Colordesc is not null or colordesc<>0)    
    
           /* --direct Debit/credit value added here*/    
    
            select @dirdebval = isnull(sum(DebQty* Rate),0)  from trs_directdeb1 inner join trs_directdeb2 on trs_directdeb1.id=trs_directdeb2.id  where type='D' and trs_directdeb1.ordid=@Ordid    
            select @dircreval= isnull(sum(DebQty* Rate),0)  from trs_directdeb1 inner join trs_directdeb2 on trs_directdeb1.id=trs_directdeb2.id  where type='C' and trs_directdeb1.ordid=@Ordid    
       
   declare     
   @DescBud varchar(100),    
   @DescAct varchar(100),    
       
   @Despatch_Rate decimal(5,0)    
 /*-- select @DescBud= @OrdQty + '*' + ((@ExpSalesBud / @OrdQty) / @Crate) +'*' + @Crate    
    
  --  If @currency = 0     
  -- begin    
  --  select @DescAct = convert (varchar,@DespatchQty + '*' + ((@ExpSalesAct / @DespatchQty) / @Despatch_Rate )+ '*' + @Despatch_Rate)    
  -- end     
  --  Else    
  --begin    
  --         select @DescAct = @DespatchQty + '*' + ((@ExpSalesAct / @DespatchQty) / @currency )+ '*' + @currency    
  --end */    
  select @DescBud='Budget'    
        select @DescAct='Actual'       
    
insert into Temp_BudgetAndActualAbs(guid ,ExpSalBudgetAmt,ExpSalActualAmt,PrsBudgetAmt,PrsActualAmt,DDBudgetAmt ,DDBActualAmt,ProdBudgetOHAmt,ProdActOHAmt ,BuyerBudgetComm,BuyerActComm,CommericalBudget,    
CommericalAct ,DescBud,DescAct, DebitValueAct,Stockvalue,DirDebitval,Dircreditval, FabricBudgetAmt,FabricActAmt,AccBudgetAmt,AccActAmt,PrdnBudgetAmt,PrdnActAmt,OrderQtyWithExcess,ShippedQty,TotalOrderQty,CutPcs,OrderQty_ForSET,ShippedQty_ForSET) VALUES (@guid,@ExpSalesBud ,@ExpSalesAct ,@ProcessBud ,@ProcessAct ,@DDBBud ,@DDBAct ,@ProdBud ,@ProdAct ,@SalesCommBud , @SalesCommAct ,@CommBud , @CommAct , @DescBud ,   
@DescAct ,@DebitValueAct ,@Stockvalue ,@dirdebval ,@dircreval,@FabricBudAmt,@FabricActAmt,@AccBudAmt,@AccActAmt,@PrdnBudAmt,@PrdnActAmt,@OrderQtyWithExcess,@ShippedQty,@OrderQtyWithOutExcess,@TotalCutPcs,@OrderQty_FORSET ,@ShippedQty_FORSET)    
set nocount off    
end


