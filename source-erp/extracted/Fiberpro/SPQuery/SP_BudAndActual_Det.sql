/*    
;=============================================    
; Author           :  Global Software's    
; Create date      :  21/11/2013    
; Create By        :  DHARANI A    
; Description      :  Budget Vs Actual Detail     
; Change Person    :  KALAIVANI
; Last Change Date :  03/02/2026 07:56 AM                     
; =============================================     

drop table Temp_BudgetAndActual_Det    
create table Temp_BudgetAndActual_Det(Guid varchar(256),Slno int,Type varchar(50),Ordid int,Deptid int,Deptname varchar(50),fabid int,cntid int,   
Acctypeid int,Accdesc int, sizedesc int,colorid int,styleno varchar(20),comid int,BudgetQty numeric(18,3),BudgetAmt numeric(18,2),ActualQty numeric(18,3),ActualAmt numeric(18,2))   create table Temp_BudgetAndActual_Det(Guid varchar(256),Slno int,Type varc
har(50),Ordid int,Deptid int,Deptname varchar(50),fabid int,cntid int,    
Acctypeid int,Accdesc int, sizedesc int,colorid int,styleno varchar(20),comid int,BudgetQty numeric(18,3),BudgetAmt numeric(18,2),ActualQty numeric(18,3),ActualAmt numeric(18,2))   
*/    

CREATE PROCEDURE SP_BudAndActual_Det 
(@Guid as varchar(256), @ORDID as int,@OverHeads as numeric(18,3),@currency as numeric(9,3),@Buyercomm as numeric(9,3),
@DDB as decimal(5,2) ,@GblCode int,@currencyflg char(1),@Reqd_TaxInPL as char(1))   AS    begin    
set nocount on declare @Sno int,  @heading varchar(50),  @Salerate numeric(18,3),@OrdQty int, @OrdExsQty int, 
@DespatchQty decimal(9,0) DECLARE @BudgetStylewise Char(1) DECLARE @DespatchCheckPoint Char(1) Declare @partial char(1)
 /* ---yarn details */ 
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid ,BudgetQty,BudgetAmt ) 
 select @Guid,1,'YARN DETAILS',@ORDID,pro_reqyarn2.deptid,deptname,'' as fabid,pro_reqyarn2.countid,pro_reqyarn2.colid ,
 Sum(pro_reqyarn.Reqkgs) as qty   ,Sum(pro_reqyarn.Reqkgs * pro_reqyarn2.Rate) as amt from pro_reqyarn2(nolock) inner join 
 MAs_dept(nolock) on pro_reqyarn2.deptid=Mas_dept.deptid inner join  pro_reqyarn (nolock) on 
 pro_reqyarn2.ordid=pro_reqyarn.ordid and pro_reqyarn2.deptid=   pro_reqyarn.deptid and pro_reqyarn2.countid=pro_reqyarn.countid  and pro_reqyarn2.colid=pro_reqyarn.colid  where
pro_reqyarn2.ordid=@ORDID and OutputType ='Y'   group by pro_reqyarn2.deptid,MAs_dept.Deptname,pro_reqyarn2.CountId ,
pro_reqyarn2.colid
/*Yarn Hot  Procees Chandru */

  insert into  Temp_BudgetAndActual_Det (Guid,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid ,BudgetQty,BudgetAmt ) 
  select @Guid,1,'YARN DETAILS',@ORDID,Trs_HotProcessRate.deptid,deptname,'' as fabid,'' as countid,'' as colid ,0 as BudgetQty,
0 as  BudgetAmt from Trs_HotProcessRate(nolock) inner join MAs_dept(nolock) on Trs_HotProcessRate.deptid=Mas_dept.deptid where
 Trs_HotProcessRate.ordid=@ORDID and OutputType ='Y' and Trs_HotProcessRate.ProcessRate <> 0   
  group by Trs_HotProcessRate.deptid,MAs_dept.Deptname
if @gblcode = 238  update b set b.ActualQty= a.kgs ,b.actualamt=A.netamount  from   (
select ordid,dept,cntid,ColId,sum(kgs) as kgs,sum(Kgs*Rate) as netamount from trs_billrate inner join Trs_BillAddded on 
Trs_BillAddded.ID = Trs_BillRate.ID inner join Mas_AddDed on Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode where 
AddDedName = 'Gross Amount' and grp = 4 group by ordid,dept,ColId,cntid ) a  inner join Temp_BudgetAndActual_Det  b 
on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId 
=b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y'  else
update b set b.ActualQty= a.kgs ,b.actualamt=A.netamount  from   (select ordid,dept,cntid,ColId,sum(kgs) as kgs,
Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then sum(netamount) Else Sum(Amount) end as 
netamount from trs_billrate inner join Trs_BillAddded on Trs_BillAddded.ID = Trs_BillRate.ID 
inner join Mas_AddDed on Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode where AddDedName = 'Gross Amount' and grp = 4 
group by ordid,dept,ColId,cntid ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and 
a.cntid=b.cntid  and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y' 
 /*update for hotprocess Chandru*/
update b set b.ActualQty= a.kgs ,b.actualamt=A.netamount,b.cntid =a.Cntid,b.colorid =a.ColId from   (
select Trs_billrate.ordid,trs_billrate.dept,cntid,ColId,sum(kgs) as kgs,Case When
 /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then sum(trs_billrate.NetAmount) Else Sum(Amount) end 
 as netamount from trs_billrate inner join Trs_BillAddded on Trs_BillAddded.ID = Trs_BillRate.ID inner join Mas_AddDed on 
 Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode inner join Trs_bills on trs_bills.id = trs_billrate.id   inner join 
 Trs_HotProcessRate on Trs_billrate.Dept = Trs_HotProcessRate.DeptID and Trs_billrate.OrdID = Trs_HotProcessRate.Ordid  
 where AddDedName = 'Gross Amount' and grp = 4 and Type='YF' and Trs_HotProcessRate.ProcessRate <> 0  
 group by Trs_billrate.ordid,trs_billrate.Dept,ColId,cntid )  a  inner join Temp_BudgetAndActual_Det  b 
 on a.ordid=b.ordid and a.dept=b.deptid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and
  OutputType ='Y' 
/*--update opening stock information */    
update b set b.ActualQty= isnull(b.ActualQty,0)+a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     
(select trs_opening.ordid,trs_opening.dept,cntid,ColId,CASE WHEN ISNULL(MtrPc,0)>0 THEN SUM(MtrPc) ELSE sum(kgs) END as kgs,
CASE WHEN ISNULL(MtrPc,0)>0 THEN sum(MtrPc*trs_opening.rate) ELSE sum(kgs*trs_opening.rate) END as netamount from 
trs_opening inner join stocktable on trs_opening.stockid= stocktable.stockid group by trs_opening.ordid,trs_opening.dept,ColId,
cntid,ISNULL(MtrPc,0) ) a    inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid 
 and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y'  
 /* 

   Insert Into Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid,ActualQty,ActualAmt,PrsType ) select @Guid,1,'YARN DETAILS',@ORDID,a.Dept, b.Deptname,'' As fabid,a.CntID, a.ColID,a.kgs, a.netamount,'OPENINGSTOCK' Fr
om  (select trs_opening.ordid,trs_opening.dept,cntid,ColId,sum(kgs) as kgs,sum(kgs*trs_opening.rate) as netamount from trs_opening inner join stocktable on trs_opening.stockid= stocktable.stockid group by trs_opening.ordid,trs_opening.dept,ColId,cntid ) a
    inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y'  */  

/*--update transfer In kgs*/    

update b set b.ActualQty= isnull(b.ActualQty,0)+a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     

(select trs_del2.tranordid as ordid,trs_Del1.Prs_dept,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount 
from trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on 
trs_del2.stockid= stocktable.stockid where trtype=3 and trs_del2.Tranordid=@ORDID  group by trs_del2.tranordid,trs_Del1.Prs_dept,
ColId,cntid ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.cntid=b.cntid  
and a.ColId =b.colorid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y'    
/*--update transfer out kgs*/    
update b set b.ActualQty= isnull(b.ActualQty,0)-a.kgs ,b.actualamt=isnull(b.actualamt,0)-a.netamount from     
(select trs_del2.ordid as ordid,trs_Del1.Prs_dept,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from 
trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= 
stocktable.stockid where trtype=3 and trs_del2.ordid=@ORDID group by trs_del2.ordid,trs_Del1.Prs_dept,ColId,cntid ) a  
inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid
   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y'    
/*--Fabric except  MAs_dept.RateMethod ='Color' */  
insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid ,BudgetQty,BudgetAmt )  
 select @Guid,2,'FABRIC DETAILS',@ORDID,Pro_ReqKnitt2.deptid,deptname, Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,
 Pro_ReqKnitt2.colid ,SUM(CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) as 
 budgetqty,    SUM((CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) * 
 (ISNULL(dbo.Pro_ReqKnitt2.Rate, 0) /*+ ISNULL(dbo.Pro_ReqKnitt2.AddRate, 0)*/)) AS Amount from pro_reqknitt2(nolock) 
 inner join MAs_dept(nolock) on   pro_reqknitt2.deptid=Mas_dept.deptid     INNER JOIN dbo.Pro_ReqKnitt(nolock) ON 
 dbo.Pro_ReqKnitt.OrdId = dbo.Pro_ReqKnitt2.OrdId AND dbo.Pro_ReqKnitt.DeptId = dbo.Pro_ReqKnitt2.DeptId AND  
 dbo.Pro_ReqKnitt.FabId = dbo.Pro_ReqKnitt2.FabId AND dbo.Pro_ReqKnitt.ColId
= dbo.Pro_ReqKnitt2.ColId AND    dbo.Pro_ReqKnitt.CntID = dbo.Pro_ReqKnitt2.CntID AND dbo.Pro_ReqKnitt.GSM = 
dbo.Pro_ReqKnitt2.GSM AND  dbo.Pro_ReqKnitt.GG = dbo.Pro_ReqKnitt2.GG AND dbo.Pro_ReqKnitt.LL = dbo.Pro_ReqKnitt2.LL AND  
dbo.Pro_ReqKnitt.DiaID = dbo.Pro_ReqKnitt2.DiaID   and dbo.Pro_ReqKnitt.FinDiaID = dbo.Pro_ReqKnitt2.FinDiaID AND 
Pro_ReqKnitt.DesignId = Pro_ReqKnitt2.DesignID LEFT OUTER JOIN Mas_UOM as Mas_UOM_1 ON Pro_ReqKnitt2.RateUOM = 
Mas_UOM_1.UOMID     where Pro_ReqKnitt2.ordid=@ORDID
 and OutputType ='F' and MAs_dept.RateMethod <>'Colour'
 group by Pro_ReqKnitt2.deptid,deptname, Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,Pro_ReqKnitt2.colid   

/*fabric hot Process */        --Chandru
 insert into  Temp_BudgetAndActual_Det (Guid,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid ,BudgetQty,BudgetAmt ) 
 select @Guid,2,'FABRIC DETAILS',@ORDID,Trs_HotProcessRate.deptid,deptname,'' as fabid,'' as countid,'' as colid ,0 as BudgetQty  
 ,0 as  BudgetAmt from Trs_HotProcessRate(nolock) inner join MAs_dept(nolock) on Trs_HotProcessRate.deptid=Mas_dept.deptid 
 where Trs_HotProcessRate.ordid=@ORDID and OutputType ='F' and Trs_HotProcessRate.ProcessRate <> 0   
 group by Trs_HotProcessRate.deptid,MAs_dept.Deptname

/*Updated actual Hot Process*/

 update b set b.ActualQty= a.kgs ,b.actualamt=A.netamount,b.Fabid =a.Fabid,b.colorid =a.ColId,b.cntid=a.cntid  from   (
 select Trs_billrate.ordid,trs_billrate.dept,Fabid,cntid,ColId,sum(kgs) as kgs,Case When 
 /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/ @Reqd_TaxInPL='Y' then sum(trs_billrate.NetAmount) Else Sum(Amount) end as 
 netamount from trs_billrate inner join Trs_BillAddded on Trs_BillAddded.ID = Trs_BillRate.ID inner join Mas_AddDed on 
 Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode inner join Trs_bills on trs_bills.id = trs_billrate.id   inner join 
 Trs_HotProcessRate on Trs_billrate.Dept = Trs_HotProcessRate.DeptID and Trs_billrate.OrdID = Trs_HotProcessRate.Ordid  
 where AddDedName = 'Gross Amount' and grp = 4 and Type='YF' and Trs_HotProcessRate.ProcessRate <> 0   
 group by Trs_billrate.ordid,trs_billrate.Dept,ColId,Fabid,cntid )  a  inner join Temp_BudgetAndActual_Det  b on 
 a.ordid=b.ordid and a.dept=b.deptid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID 
 and OutputType ='F' 

 /*Here   For Actual Kgs -> Only Process Kgs only to be update 
 --KGS  updation */

update b set b.ActualQty= a.kgs  from    (select ordid,Y.dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(Kgs*Rate) as netamount
 from trs_Bills X INNER JOIN trs_billrate Y ON X.ID = Y.ID inner join Trs_BillAddded Z on x.id = z.id inner join Mas_AddDed 
 on Mas_AddDed.AddDedCode = Z.Adddedcode inner join Mas_Party on x.party = Mas_Party.PID
Where X.BillType in ('Purchase','Process') and Mas_AddDed.AddDedName = 'Gross Amount' and Grp = 4  
 group by ordid,Y.dept,ColId,fabid,cntid,BillType ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
 a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  
 on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   and   c.RateMethod <>'Color'  

 /*Amount updation -- Here   For Actual Amount -> Only Process and Reprocess Amount to be update */

if @gblcode = 238
 update b set b.actualamt=a.netamount  from  (select ordid,Trs_billrate.dept,fabid,cntid,ColId,sum(kgs) as kgs,
 sum(Kgs*Rate) as netamount from trs_billrate inner join Trs_bills on Trs_bills.id = Trs_BillRate.id inner join 
 Trs_BillAddded on Trs_BillAddded.id = trs_bills.id inner join Mas_AddDed on Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode 
 Where Mas_AddDed.AddDedName = 'Gross Amount' and Grp = 4  group by ordid,trs_billrate.dept,ColId,fabid,cntid ) a    
  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid 
   and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   and 
      c.RateMethod <>'Color'
else
begin 
update b set b.actualamt=a.netamount  from  (select ordid,Trs_billrate.dept,fabid,cntid,ColId,sum(kgs) as kgs,
Case When @Reqd_TaxInPL='Y' And IsNull(Fcy,0)>0   then sum(Trs_BillRate.netamount) * IsNull(exchangeRate,0)  Else 
Case When @Reqd_TaxInPL='Y' And IsNull(Fcy,0)=0   then sum(Trs_BillRate.netamount) ELSE
Case When @Reqd_TaxInPL='N' And IsNull(Fcy,0)>0   then sum(Trs_BillRate.Amount) * IsNull(exchangeRate,0)  Else 
Case When @Reqd_TaxInPL='N' And IsNull(Fcy,0)=0   then sum(Trs_BillRate.Amount) END END END END as netamount 
from trs_billrate inner join Trs_bills on Trs_bills.id = Trs_BillRate.id inner join Trs_BillAddded on Trs_BillAddded.id =
 trs_bills.id inner join Mas_AddDed on Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode 
inner join Mas_Party on Trs_bills.party = Mas_Party.PID  Left Join Trs_Po1 On Trs_BillRate.PoId=Trs_Po1.Id 
WHERE Mas_AddDed.AddDedName = 'Gross Amount' and Mas_AddDed.Grp = 4 AND
IsNull(BillType,'')='Purchase' and 
(Trs_BillRate.ID = (SELECT DISTINCT invid FROM trs_grn1 INNER JOIN trs_grn2 ON trs_grn1.id=trs_grn2.Id 
WHERE trs_grn2.Invid = trs_billrate.id AND trs_grn2.Invid = trs_bills.id AND dept = Trs_Billrate.Dept and 
trs_grn2.OrdId=trs_billrate.OrdId and Trs_Grn2.ORDID=@OrdID ))
group by ordid,trs_billrate.dept,ColId,fabid,cntid ,IsNull(Fcy,0),IsNull(exchangeRate,0) ) a     inner join 
Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  
and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   and  
  c.RateMethod <>'Color'
update b set b.actualamt=a.netamount  from  (select ordid,Trs_billrate.dept,fabid,cntid,ColId,sum(kgs) as kgs,
Case When @Reqd_TaxInPL='Y' then sum(Trs_BillRate.netamount)   Else  sum(Trs_BillRate.Amount) END as netamount 
from trs_billrate inner join Trs_bills on Trs_bills.id = Trs_BillRate.id inner join Trs_BillAddded on Trs_BillAddded.id = 
trs_bills.id inner join Mas_AddDed on Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode 
inner join Mas_Party on Trs_bills.party = Mas_Party.PID
WHERE Mas_AddDed.AddDedName = 'Gross Amount' and Mas_AddDed.Grp = 4 AND IsNull(BillType,'') <> 'Purchase' 
group by ordid,trs_billrate.dept,ColId,fabid,cntid  ) a     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on 
b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'  and    c.RateMethod <>'Color'
End

/*--update openignstock*/    

 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt= isnull( b.actualamt,0) + netamount from   (
 select trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,CASE WHEN ISNULL(MtrPc,0)>0 THEN sum(MtrPc) ELSE sum(kgs) END as kgs,
 CASE WHEN ISNULL(MtrPc,0)>0 THEN sum(MtrPc*trs_opening.rate) ELSE sum(kgs*trs_opening.rate) END as netamount from trs_opening 
inner join stocktable on trs_opening.stockid=stocktable.stockid  group by trs_opening.ordid,trs_opening.dept,ColId,fabid,cntid ,
ISNULL(MtrPc,0)) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and
 a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid 
 where  b.ordid=@ORDID and OutputType ='F' 
/*and c.RateMethod <>'Color'     */
 /*
Insert into Temp_BudgetAndActual_Det (Guid,Slno ,Type ,ordid,Deptid,Deptname,fabid,cntid,colorid,ActualQty,actualamt,PrsType) Select @Guid,2,'FABRIC DETAILS',@ORDID,a.Dept,b.Deptname,a.FabID,a.CntID,a.ColID,a.Kgs, netamount,'OPENINGSTOCK' From  
   (select trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(kgs*trs_opening.rate) as netamount from trs_opening  inner join stocktable on trs_opening.stockid=stocktable.stockid  group by trs_opening.ordid,trs_opening.dept,ColId,fab
id,cntid ) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid   and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F
'  */  

/* Update YARN Actual for OWN PARTY GRNS */

update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt= isnull( b.actualamt,0) + netamount from   (
select B.ordid,A.dept,C.fabid,C.cntid,C.ColId,sum(Reckgs) as kgs,sum(RecKgs* isnull(P.Rate,0)) as netamount from Trs_Grn1 A 
INNER JOIN trs_Grn2 B ON A.ID = B.ID   inner join stocktable C on B.stockid=C.stockid  
INNER JOIN Pro_ReqYarn2 P ON B.ordid = P.OrdId And  P.CountId = C.CntID And P.ColId = C.ColID 
INNER JOIN Mas_Party ON A.SuppID = Mas_Party.PID
WHERE Mas_Party.Own_Party='Y' And Isnull(ProcessType,'')<>'R'
group by B.ordid,A.dept,C.ColId,C.fabid,C.cntid ) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock) 
 on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='Y'

/* Update Fabric Actual for OWN PARTY GRNS */
 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt= isnull( b.actualamt,0) + netamount from   (
 select B.ordid,A.dept,C.fabid,C.cntid,C.ColId,sum(Reckgs) as kgs,sum(RecKgs* isnull(P.Rate,0)) as netamount from Trs_Grn1 A 
 INNER JOIN trs_Grn2 B ON A.ID = B.ID   inner join stocktable C on B.stockid=C.stockid  
 INNER JOIN Pro_ReqKnitt2 P ON B.ordid = P.OrdId And P.FabId = C.FabID And  P.CntID = C.CntID
And P.ColId = C.ColID And P.DiaID = C.DiaID And P.FinDiaId = C.FinDiaID And P.GSM = C.Gsm
And P.GG = C.GG And P.LL = C.LL and P.DesignID = C.PRINT_DESIGNID And P.SubPrsID = A.SubPrsID 
And P.FinGSM = C.FinGsm  INNER JOIN Mas_Party ON A.SuppID = Mas_Party.PID
WHERE Mas_Party.Own_Party='Y' And Isnull(ProcessType,'')<>'R'
 group by B.ordid,A.dept,C.ColId,C.fabid,C.cntid ) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
 a.dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on 
 b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'

 /*--update TransferIn kgs*/    

 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt= isnull( b.actualamt,0) + netamount from     
 (select trs_del2.tranordid as ordid,trs_del1.prs_dept ,fabid,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount 
 from trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= 
 stocktable.stockid where trtype=3 and trs_del2.tranordid=@ORDID  group by trs_del2.tranordid,trs_del1.Prs_dept,ColId,fabid,
 cntid ) a inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.Prs_dept=b.deptid and a.cntid=b.cntid  and 
 a.ColId =b.colorid  and
a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   
and c.RateMethod <>'Color'  

/*--update Transferout kgs*/

update b set b.ActualQty= isnull(b.ActualQty,0)- a.kgs ,b.actualamt= isnull( b.actualamt,0) - netamount from     
(select trs_del2.ordid as ordid,trs_del1.prs_dept ,fabid,cntid,ColId,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from 
trs_del1(nolock) inner join trs_del2 (nolock) on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= 
stocktable.stockid where trtype=3 and trs_del2.ordid=@ORDID group by trs_del2.ordid,trs_del1.Prs_dept,ColId,fabid,cntid ) a   
  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.Prs_dept=b.deptid and a.cntid=b.cntid  and a.ColId =b.colorid
    and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'
	and c.RateMethod <>'Color'

/*--Fabric except  MAs_dept.RateMethod <> 'Color' */    

 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid,colorid  ,BudgetQty,BudgetAmt )    

select @Guid,2,'FABRIC DETAILS',@ORDID,Pro_ReqKnitt2.deptid,deptname,Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,
Pro_ReqKnitt2.colid  ,SUM(CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) as 
budgetqty,  SUM((CASE WHEN Mas_UOM_1.UOM = 'KGS' THEN dbo.Pro_ReqKnitt.ReqKgs ELSE dbo.Pro_ReqKnitt.ReqMtr END) * 
(ISNULL(dbo.Pro_ReqKnitt2.Rate, 0) /*  + ISNULL(dbo.Pro_ReqKnitt2.AddRate, 0)*/ )) AS Amount from pro_reqknitt2(nolock) 
inner join MAs_dept(nolock) on pro_reqknitt2.deptid=Mas_dept.deptid     INNER JOIN dbo.Pro_ReqKnitt(nolock) ON 
dbo.Pro_ReqKnitt.OrdId = dbo.Pro_ReqKnitt2.OrdId AND dbo.Pro_ReqKnitt.DeptId = dbo.Pro_ReqKnitt2.DeptId AND  
dbo.Pro_ReqKnitt.FabId = dbo.Pro_ReqKnitt2.FabId AND dbo.Pro_ReqKnitt.ColId = 
dbo.Pro_ReqKnitt2.ColId AND    dbo.Pro_ReqKnitt.CntID = dbo.Pro_ReqKnitt2.CntID AND dbo.Pro_ReqKnitt.GSM = dbo.Pro_ReqKnitt2.GSM
 AND  dbo.Pro_ReqKnitt.GG = dbo.Pro_ReqKnitt2.GG AND dbo.Pro_ReqKnitt.LL = dbo.Pro_ReqKnitt2.LL AND  dbo.Pro_ReqKnitt.DiaID =
  dbo.Pro_ReqKnitt2.DiaID  
  and dbo.Pro_ReqKnitt.FinDiaID = dbo.Pro_ReqKnitt2.FinDiaID LEFT OUTER JOIN Mas_UOM as Mas_UOM_1 ON Pro_ReqKnitt2.RateUOM = 
  Mas_UOM_1.UOMID         where Pro_ReqKnitt.ordid=@ORDID and OutputType ='F' and MAs_dept.RateMethod ='Colour' 
  group by Pro_ReqKnitt2.deptid,deptname,Pro_ReqKnitt2.fabid ,Pro_ReqKnitt2.cntid,Pro_ReqKnitt2.colid 
if @gblcode = 238
update b set b.ActualQty= a.kgs  ,b.actualamt=a.netamount from   (select ordid,dept,ColId,sum(kgs) as kgs,sum(Kgs*Rate) as 
netamount from trs_billrate inner join Trs_BillAddded on Trs_BillAddded.id = Trs_BillRate.id inner join Mas_AddDed on
 Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode where Mas_AddDed.AddDedName = 'Gross Amount' and Grp = 4
  group by ordid,dept,ColId) a      inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid  
  and a.ColId =b.colorid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   
  and c.RateMethod ='Colour'else

--By Kirthiga On 22-Sep-2018 To Calculate ActQty And ActAmount For Fabric (Dyeing Dept)
update b set b.ActualQty= a.kgs  ,b.actualamt=a.netamount from   (select ordid,dept,ColId,fabid,sum(kgs) as kgs,
Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then sum(Trs_BillRate.netamount) Else
 Sum(Trs_BillRate.Amount) end as netamount from trs_billrate inner join Trs_BillAddded on Trs_BillAddded.id = Trs_BillRate.id
  inner join Mas_AddDed on Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode where Mas_AddDed.AddDedName = 'Gross Amount' 
  and Grp = 4 group by ordid,dept,ColId,Fabid) a      inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
  a.dept=b.deptid  and a.ColId =b.colorid and a.fabid=b.fabid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where 
   b.ordid=@ORDID and OutputType ='F'   and c.RateMethod ='Colour'
 /* --update opening stock*/    
update b set b.ActualQty=  b.ActualQty+a.kgs  ,b.actualamt=isnull(b.actualamt,0) + netamount from    
 (select trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,CASE WHEN ISNULL(MtrPc,0)>0 THEN SUM(MtrPc) ELSE sum(kgs)
  END as kgs,CASE WHEN ISNULL(MtrPc,0)>0 THEN sum(MtrPc *trs_opening.rate) ELSE sum(kgs *trs_opening.rate) END as netamount 
  from trs_opening inner join stocktable on trs_opening.stockid= stocktable.stockid  
  group by trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,ISNULL(MtrPc,0)) a      inner join Temp_BudgetAndActual_Det  b 
  on a.ordid=b.ordid and a.dept=b.deptid and  a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid   
  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'  and c.RateMethod ='Colour' 

/* added for knitting openig double*/

 /* and c.RateMethod ='Colour' old */

/* --update transfer in kgs*/  

update b set b.ActualQty=  b.ActualQty+a.kgs  ,b.actualamt=isnull(b.actualamt,0) + a.netamount from
(select trs_del2.tranordid as ordid,trs_del1.prs_dept,fabid,cntid,ColId,sum(kg) as kgs,sum(trs_del2.kg *trs_del2.rate) as 
netamount from trs_del1 inner join trs_del2 on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= 
stocktable.stockid where trtype=3 and trs_del2.tranordid=@ORDID   
group by trs_del2.tranordid,trs_del1.prs_dept,fabid,cntid,ColId) a    inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid
 and a.prs_dept=b.deptid   and a.cntid=b.cntid  and a.fabid=b.fabid   and a.ColId =b.colorid  inner join MAs_dept as c(nolock) 
  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   and c.RateMethod ='Colour' 

/*--update transfer out kgs*/    

update b set b.ActualQty=  b.ActualQty-a.kgs  ,b.actualamt=isnull(b.actualamt,0) - a.netamount from    
(select trs_del2.ordid as ordid,trs_del1.prs_dept,fabid,cntid,ColId,sum(kg) as kgs,sum(trs_del2.kg *trs_del2.rate) as netamount
 from trs_del1 inner join trs_del2 on trs_del1.id=trs_del2.id  inner join stocktable on trs_del2.stockid= stocktable.stockid 
where trtype=3 and trs_del2.ordid=@ORDID   group by trs_del2.ordid,trs_del1.prs_dept,fabid,cntid,ColId) a    
inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid   and a.cntid=b.cntid  and a.fabid=b.fabid   
and a.ColId =b.colorid  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType ='F'   
and c.RateMethod ='Colour' 

/*Insert Into Temp_BudgetAndActual_Det (Guid,Slno ,Type ,ordid,Deptid,Deptname,fabid,cntid,colorid,ActualQty,actualamt,PrsType) Select @Guid,2,'FABRIC DETAILS',@ORDID,a.Dept,b.Deptname,a.FabID,a.CntID,a.ColID,a.kgs,a.netamount,'OPENINGSTOCK'  From
 (select trs_opening.ordid,trs_opening.dept,fabid,cntid,ColId,sum(kgs) as kgs,sum(kgs *trs_opening.rate) as netamount from trs_opening inner join stocktable on trs_opening.stockid= stocktable.stockid  group by trs_opening.ordid,trs_opening.dept,fabid,cnti
d ,ColId) a      inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and  a.cntid=b.cntid  and a.ColId =b.colorid  and a.fabid=b.fabid   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where  b.ordid=@ORDID and OutputType 
='F'  and c.RateMethod ='Colour' */

/* -- Accessories information */    

insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,Acctypeid ,Accdesc,colorid,sizedesc ,
BudgetQty,BudgetAmt )   select @Guid,3,'ACCESSORY DETAILS',@ORDID,Pro_AccBudRate.prsid,deptname,Pro_AccBudRate.Acc_Type ,
Pro_AccBudRate.Acc_Desc ,Pro_AccBudRate.Clr ,Pro_AccBudRate.Siz, SUM(dbo.PRO_AccReq.ReqdQty) AS reqqty ,
SUM(dbo.PRO_AccReq.ReqdQty * (ISNULL(dbo.Pro_AccBudRate.BudRate, 0) 
/*  + ISNULL(dbo.Pro_AccBudRate.AddRate, 0)*/
)) AS amount FROM dbo.PRO_AccReq INNER JOIN dbo.Pro_AccBudRate ON dbo.PRO_AccReq.OrdID = dbo.Pro_AccBudRate.OrdID AND 
dbo.PRO_AccReq.Acc_Type = dbo.Pro_AccBudRate.Acc_Type AND dbo.PRO_AccReq.Acc_Desc =dbo.Pro_AccBudRate.Acc_Desc AND 
dbo.PRO_AccReq.Clr = dbo.Pro_AccBudRate.Clr AND dbo.PRO_AccReq.Siz = dbo.Pro_AccBudRate.Siz  inner join Mas_dept on 
Pro_AccBudRate.prsid=MAs_dept.deptid INNER JOIN ORderMas ON dbo.PRO_AccReq.Ordid = OrderMas.Ordid  and PRO_AccReq.PrsID = 
Pro_AccBudRate.PrsID where pro_accreq.ordid=@ORDID and Mas_dept.RateMethod ='-'  and PurchaseType = case when 
mas_dept.AccProsDept ='Y' then 'Process' Else 'Purchase' END  group by Pro_AccBudRate.prsid,deptname,Pro_AccBudRate.Acc_Type ,
Pro_AccBudRate.Acc_Desc ,Pro_AccBudRate.Clr ,Pro_AccBudRate.Siz
if @gblcode = 238
update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from    (select trs_billrate.ordid,dept,atype,Ades,ColId,Asiz,sum(kgs) 
 as Kgs,sum(Kgs*Rate) as NetAmount  from trs_billrate  INNER JOIN OrderMas ON trs_billrate.Ordid = OrderMas.Ordid inner join 
Trs_BillAddded on Trs_BillAddded.id  = Trs_BillRate.ID inner join Mas_AddDed on Mas_AddDed.AddDedCode = 
Trs_BillAddded.Adddedcode where  Mas_AddDed.AddDedName = 'Gross Amount' and Grp = 4 group by trs_billrate.ordid,dept,atype,Ades,
ColId,Asiz) a     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.atype=b.Acctypeid   
and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.Asiz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid 
 where  b.ordid=@ORDID and guid=@Guid 
else
update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from    (select trs_billrate.ordid,Trs_BillRate.dept,atype,Ades,
ColId,Asiz,sum(kgs)  as Kgs,Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then 
Case When Trs_Bills.BillType='Purchase' Then Case When IsNull(trs_po1.Fcy,0)>0 Then (Sum(Trs_BillRate.NetAmount) * 
IsNull(Trs_Po1.exchangeRate,0)) Else Sum(Trs_BillRate.NetAmount) End Else Sum(Trs_BillRate.NetAmount) End  
 Else Case When Trs_Bills.BillType='Purchase' Then Case When IsNull(trs_po1.Fcy,0)>0 Then Sum(Trs_BillRate.Amount) * 
 IsNull(Trs_Po1.exchangeRate,0) ELSE 
Sum(Trs_BillRate.Amount) END  else  Sum(Trs_BillRate.Amount)  End  END as netamount  from trs_billrate  INNER JOIN OrderMas 
ON trs_billrate.Ordid = OrderMas.Ordid  INNER JOIN Trs_Bills ON Trs_BillRate.ID = trs_Bills.ID
 INNER JOIN Trs_BillAddded on Trs_BillAddded.id  = Trs_BillRate.ID inner join Mas_AddDed on Mas_AddDed.AddDedCode = 
 Trs_BillAddded.Adddedcode Left Join Trs_Po1 On Trs_BillRate.PoId=Trs_Po1.Id 
 where  Mas_AddDed.AddDedName = 'Gross Amount' and Mas_AddDed.Grp = 4 group by trs_billrate.ordid,Trs_BillRate.dept,atype,Ades,
 ColId,Asiz,Trs_Bills.BillType,Trs_Po1.Fcy,trs_po1.exchangeRate) a     inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid
  and a.dept=b.deptid and a.atype=b.Acctypeid   and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.Asiz =b.sizedesc    
   inner join MAs_dept as c(nolock)  on b.deptid=c.deptid  where  b.ordid=@ORDID and guid=@Guid 

 /* --Opening stock*/ 

 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from  
(select trs_opening.ordid,trs_opening.dept,atype,Ades,ColId,siz,CASE WHEN ISNULL(MtrPc,0)>0 THEN SUM(MtrPc) ELSE sum(kgs) 
END as kgs,CASE WHEN ISNULL(MtrPc,0)>0 THEN sum(MtrPc*trs_opening.rate) ELSE sum(kgs*trs_opening.rate) END as netamount from
 trs_opening(nolock) inner join stocktable(nolock) on trs_opening.stockid=stocktable.stockid  group by trs_opening.ordid, 
trs_opening.dept,atype,Ades,ColId,siz,ISNULL(MtrPc,0)) a      inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
a.dept=b.deptid and a.atype=b.Acctypeid  and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join 
MAs_dept as c(nolock) on b.deptid=c.deptid 	 where  b.ordid=@ORDID  and guid=@Guid 

/* Insert Into Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,Acctypeid ,Accdesc,colorid,sizedesc ,ActualQty,ActualAmt,PrsType ) Select @Guid,3,'ACCESSORY DETAILS',@ORDID,a.Dept, b.Deptname, a.Atype, a.Ades, a.ColID, a.Siz,kgs,netamou
nt,'OPENINGSTOCK'   From
(select trs_opening.ordid,trs_opening.dept,atype,Ades,ColId,siz,sum(kgs) as kgs,sum(kgs*trs_opening.rate) as netamount from trs_opening(nolock) inner join stocktable(nolock) on trs_opening.stockid=stocktable.stockid  group by trs_opening.ordid, trs_openin
g.dept,atype,Ades,ColId,siz) a      inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and a.atype=b.Acctypeid  and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join MAs_dept as c(nolock)
 on b.deptid=c.deptid 	 where  b.ordid=@ORDID  and guid=@Guid  */

 /*--update tranfer in  kgs*/   
 update b set b.ActualQty= isnull(b.ActualQty,0)+ a.kgs ,b.actualamt=isnull(b.actualamt,0)+a.netamount from     
(select trs_del2.tranordid as ordid,trs_del1.prs_dept,atype,Ades,ColId,siz,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount 
from trs_del1 (nolock) inner join trs_del2 on trs_del1.id=trs_del2.id    inner join stocktable(nolock) on trs_del2.stockid=    
stocktable.stockid where trtype=8 and trs_del2.tranordid=@ORDID  group by trs_del2.tranordid,trs_del1.prs_dept,atype,Ades,ColId,
siz) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.atype=b.Acctypeid   
and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid 
where  b.ordid=@ORDID  and guid=@Guid    
/* --update tranfer out  kgs*/   
 update b set b.ActualQty= isnull(b.ActualQty,0)- a.kgs ,b.actualamt=isnull(b.actualamt,0)-a.netamount from    
 (select trs_del2.ordid as ordid,trs_del1.prs_dept,atype,Ades,ColId,siz,sum(kg) as kgs,sum(kg*trs_del2.rate) as netamount from 
 trs_del1 (nolock) inner join trs_del2 on trs_del1.id=trs_del2.id   inner join stocktable(nolock) on 
 trs_del2.stockid=stocktable.stockid where trtype=8 and trs_del2.ordid=@ORDID  group by trs_del2.ordid,trs_del1.prs_dept,atype,
 Ades,ColId,siz) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.prs_dept=b.deptid and a.atype=b.Acctypeid   
 and a.Ades  =b.Accdesc and a.ColId =b.colorid and a.siz =b.sizedesc     inner join MAs_dept as c(nolock)  on b.deptid=c.deptid 
 where  b.ordid=@ORDID  and guid=@Guid 

 /*-- Inhouse production*/    
 if @gblcode<>123 
 BEgin
/* commented by Divya-10-MAy-2018 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,budgetamt )    
select @Guid,4,'PRODUCTION',ordid,wrkid, WorkComplDet ,styleno ,Case When Rate>0 Then Rate Else JobWrkRate End As Rate from Trs_ProdExp  inner join Mas_JobWrkComp (nolock) on Trs_ProdExp.wrkid=Mas_JobWrkComp.id  where Ordid=@ORDID */
 DECLARE @BudgetClrwise char(1) /*chandru*/
SELECT @BudgetClrwise  = IsNUll(BudRt_Inhccw,'N') from Options   
--Test
/* PartWise Rate Production */
 if @BudgetClrwise ='N'
begin

insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,budgetamt,SeqNo,PartId,PartDesc)    
 select @Guid,4,'PRODUCTION',Trs_ProdExp.ordid,Trs_ProdExp.WrkID, WorkComplDet ,Trs_ProdExp.styleno ,
 Case When IsNull(Avg(PD.Rate),0)>0 Then IsNull(Avg(PD.Rate),0) Else IsNull(Avg(PD.JobWrkRate),0) End As Rate,Mas_Dept.OrderSno,
 Mas_Part.PartID,Mas_Part.PartName from Trs_ProdExp 
 Inner Join Pro_Prod_PartwiseRate PD On Trs_ProdExp.Ordid  = PD.Ordid AND Trs_ProdExp.StyleNo = PD.Styleno AND 
 Trs_ProdExp.WrkID = PD.WrkID
inner join Mas_JobWrkComp (nolock) on Trs_ProdExp.wrkid=Mas_JobWrkComp.id Inner Join Mas_Dept On Mas_Dept.deptid=
Mas_JobWrkComp.DeptId Inner join Mas_Part On PD.PartID = Mas_Part.PartID where Trs_ProdExp.Ordid=@ORDID    
Group By Trs_ProdExp.ordid,Trs_ProdExp.styleno,Mas_Dept.OrderSno,WorkComplDet ,Trs_ProdExp.wrkid,Mas_Part.PartID,
Mas_Part.PartName

End 
insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,budgetamt,SeqNo,PartId,PartDesc )    
select @Guid,4,'PRODUCTION',Trs_ProdExp.ordid,Trs_ProdExp.WrkID, WorkComplDet ,Trs_ProdExp.styleno ,
Case When IsNull(Avg(PD.Rate_Pcs),0)>0 Then IsNull(Avg(PD.Rate_Pcs),0) Else IsNull(Avg(PD.JobWrkRate),0) End As Rate,
Mas_Dept.OrderSno,Mas_Part.PartID,Mas_Part.PartName from Trs_ProdExp 
Inner Join Bud_InhRateclw PD On Trs_ProdExp.Ordid  = PD.Ordid AND Trs_ProdExp.StyleNo = PD.Styleno AND Trs_ProdExp.WrkID = 
PD.NWork inner join Mas_JobWrkComp (nolock) on Trs_ProdExp.wrkid=Mas_JobWrkComp.id Inner Join Mas_Dept On Mas_Dept.deptid=
Mas_JobWrkComp.DeptId INNER JOIN Mas_Part ON Mas_Part.PartID = PD.PartID  where Trs_ProdExp.Ordid=@ORDID
Group By Trs_ProdExp.ordid,Trs_ProdExp.styleno,Mas_Dept.OrderSno,WorkComplDet ,Trs_ProdExp.wrkid,Mas_Part.PartID,
Mas_Part.PartName

/* ASLAM for Hot process */
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,budgetamt,SeqNo,PartId,PartDesc )    
 select @Guid,4,'PRODUCTION',Trs_ProdExp.ordid, Trs_ProdExp.DeptID as WrkID, WorkComplDet ,B.styleno ,
 Case When IsNull(Avg(PD.Rate),0)>0 Then IsNull(Avg(PD.Rate),0) Else IsNull(Avg(PD.JobWrkRate),0) End As Rate,
 Mas_Dept.OrderSno,Mas_Part.PartID,Mas_Part.PartName from Trs_HotProcessRate as Trs_ProdExp
INNER JOIN OrderStyleDtl B ON Trs_ProdExp.Ordid = B.OrdID LEFT Join Pro_Prod_PartwiseRate PD On Trs_ProdExp.Ordid  = PD.Ordid 
AND B.StyleNo = PD.Styleno AND Trs_ProdExp.DeptID = PD.WrkID inner join Mas_JobWrkComp (nolock) on Trs_ProdExp.DeptID=
Mas_JobWrkComp.id Inner Join Mas_Dept On Mas_Dept.deptid=Mas_JobWrkComp.DeptId INNER JOIN Mas_Part ON Mas_Part.PartID = 
PD.PartID where Trs_ProdExp.Ordid=@ORDID and (Trs_ProdExp.ProcessRate >0 OR Trs_ProdExp.JobWrkRate > 0) and Fab_Pcs_Dept ='P'
Group By Trs_ProdExp.ordid,B.styleno,Mas_Dept.OrderSno,WorkComplDet ,Trs_ProdExp.DeptID,Mas_Part.PartID,Mas_Part.PartName 

/* Pcs Hot Process */

 insert into  Temp_BudgetAndActual_Det (Guid,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,fabid ,cntid,colorid ,BudgetQty,BudgetAmt,PartId,PartDesc )
Select @GUID, 4,'PRODUCTION',@ORDID,StageID,WorkComplDet,A.StyleNo,0,0,0,0,0,PartID,PartName From
 (select distinct PE.ordid,MD.deptid,PE.styleno,     IsNull(Sum(QD.CutPlanQty),0)  orderQty, 0 as  Rate,0 as ActualRate,
 PE.StageID as StageID,Sum(QD.CutPlanQty) as budgetqty, Mas_Part.PartID,mas_part.PartName,WorkComplDet    
 From   Trs_ProdEntry PE  (nolock)    Inner Join  OrderQtyDtl  QD  (nolock)  On PE.Ordid  = QD.Ordid AND  PE.StyleNo = 
 QD.StyleNo     left outer join mas_jobwrkcomp JW  (nolock)  on PE.StageID  = JW.id  left outer join mas_dept  MD  (nolock)  
 on JW.deptid = MD.deptid  Inner Join Mas_Part On Mas_Part.PartID = PE.PARTID   where PE.ordid in(
 select id from fnSplitter(@OrdID)) and PE.StageID not in (SELECT DISTINCT DeptId FROM Temp_BudgetAndActual_Det 
 WHERE DeptId IS NOT NULL And Type =  'PRODUCTION' and Guid=@Guid    )group by PE.ordid
, MD.deptid,  PE.StageID, PE.styleno ,Mas_Part.PartID,mas_part.PartName,WorkComplDet 
UNION ALL
 SELECT DISTINCT Trs_Pcs1.Ordjobno As OrdId, Mas_Dept.DeptID,Trs_Pcs2.StyleNo,IsNull(Sum(QD.CutPlanQty),0)  orderQty, 0 as  Rate,
 0 as ActualRate,Mas_JobWrkComp.Id AS StageId,Sum(QD.CutPlanQty) as budgetqty,Mas_Part.PartID,Mas_Part.PartName,WorkComplDet  
FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderQtyDtl QD ON Trs_Pcs1.Ordjobno = QD.OrdID 
AND Trs_Pcs2.StyleNo = QD.StyleNo INNER JOIN Mas_JobWrkComp ON Mas_JobWrkComp.Id = Trs_Pcs1.TargetStageID INNER JOIN Mas_Dept ON
 Mas_Dept.DeptID = Mas_JobWrkComp.DeptId Inner Join Mas_Part On Mas_Part.PartID = Trs_Pcs2.PartID WHERE Trs_Pcs1.Ordjobno IN 
 (SELECT ID FROM fnSplitter(@OrdID)) AND TargetStageID NOT IN (SELECT DISTINCT DeptId FROM Temp_BudgetAndActual_Det WHERE 
 DeptId IS NOT NULL And Type =  'PRODUCTION' and Guid=@Guid )
 GROUP BY   Trs_Pcs1.Ordjobno,Mas_Dept.DeptID,Trs_Pcs2.StyleNo,Mas_JobWrkComp.Id,Mas_Part.PartID,Mas_Part.PartName,WorkComplDet)
  A Group by ordid, deptid,  StageID,WorkComplDet ,PartID,PartName,StyleNo
 update b set b.ActualQty= a.kgs ,b.actualamt=A.netamount,b.styleno = a.styleno,b.PartId = a.partId,b.PartDesc = a.PartName
  from   (Select Z.OrdID,Z.StageId,Z.styleno,Z.partId,Z.PartName,ISNULL(SUM(kgs),0) As Kgs,ISNULL(SUM(Z.netamount),0) As
   netamount,Z.DeptId  From(
 select Distinct Trs_billrate.ordid,trs_billrate.dept As StageId,Fabid,cntid,ColId,(Mtr) as kgs,Case When 
 /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/ @Reqd_TaxInPL='Y' then (trs_billrate.NetAmount) Else (Amount) end as 
 netamount, Mas_JobWrkComp.DeptId,Trs_BillRate.styleno,Trs_BillRate.PanelID As partId, Mas_Part.PartName from trs_billrate 
 inner join Trs_BillAddded on Trs_BillAddded.ID = Trs_BillRate.ID inner join Mas_AddDed on Mas_AddDed.AddDedCode = 
 Trs_BillAddded.Adddedcode inner join Trs_bills on trs_bills.id = trs_billrate.id   inner join 
 Trs_HotProcessRate on Trs_billrate.Dept = Trs_HotProcessRate.DeptID and Trs_billrate.OrdID = Trs_HotProcessRate.Ordid 
 Inner Join Mas_JobWrkComp on Mas_JobWrkComp.Id = Trs_BillRate.Dept Inner Join Mas_Part On Mas_Part.PartID = 
 Trs_BillRate.PanelID  where AddDedName = 'Gross Amount' and Type='PP'  and Fab_Pcs_Dept ='P' and 
 Trs_HotProcessRate.ProcessRate <> 0 AND Trs_BillRate.OrdID IN(SELECT ID FROM fnSplitter(@OrdID)))Z   
 group by Z.ordid,Z.StageId,Z.DeptId,Z.styleno,Z.partId , Z.PartName)  a  inner join Temp_BudgetAndActual_Det  b on 
 a.ordid=b.ordid and a.StageId=b.deptid Inner Join Mas_Dept On Mas_Dept.DeptID = a.DeptId where  b.ordid=@ORDID and 
 OutputType ='P'  AND Guid = @Guid

--Group By Trs_ProdExp.ordid,Trs_ProdExp.wrkid,WorkComplDet,Trs_ProdExp.styleno 
/* --budget qty - SemiFinish*/   
Begin  If (Select Isnull(JobType,'Ord') From OrderMas Where OrdId =@OrdID)='Job' BEGIN  
   update a set a.BudgetQty =x.budgetqty ,a.BudgetAmt = a.BudgetAmt*x.budgetqty  from       (select PE.ordid,PE.styleno,PE.WrkID As StageID,
   case when isNull(Allow_Excess_InBudget,'N') ='N' then sum(QD.OrderQty ) ELSE
 sum(QD .CutPlanQty ) END as budgetqty,Mas_Part.PartID from Trs_ProdExp PE  INNER JOIN OrderQtyDtl QD ON QD.OrdID = PE.OrdId and QD.StyleNo = PE.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and PE.StyleNo = PR.Styleno And PE.WrkID = 
 PR.WrkID AND QD.PartID = PR.PartID LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID and Qd.SizeId = PR1.SizeId left outer join mas_jobwrkcomp JW  (nolock) 
  on PE.wrkid  = JW.id     left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid LEFT OUTER JOIN Mas_Part ON Mas_Part.PartID = QD.PartID
   left join options on 1=1 
   Where PE.ordid=@ORDID and MD.SEMIFINISH ='S' and JW.Pcstype <> 'Bit' group by PE.ordid,PE.styleno,PE.WrkID,isNull(Allow_Excess_InBudget,'N'),Mas_Part.PartID) x     
inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno And X.StageID = a.Deptid  AND a.PartId = X.PartID where type='PRODUCTION'  
--Swetha TicketNo - 3663 PS Exports OrderQty has been taken from Pro_Prod_PartwiseRate AND OrderQtyDtl table has been removed
End Else Begin
update a set a.BudgetQty =x.budgetqty ,a.BudgetAmt = a.BudgetAmt*x.budgetqty  from       
(select PE.ordid,PE.styleno,PE.WrkID As StageID,
case when isNull(Allow_Excess_InBudget,'N') ='N' then sum(PR.OrderQty ) ELSE
sum(PR.ORderQtyExcess ) END as budgetqty,Mas_Part.PartID from Trs_ProdExp PE   LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) 
On PE.OrdId = PR.OrdID and PE.StyleNo = PR.Styleno And PE.WrkID = 
PR.WrkID LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID =
 PR1.NWork    left outer join mas_jobwrkcomp JW  (nolock) 
 on PE.wrkid  = JW.id     left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid LEFT OUTER JOIN Mas_Part ON 
 Mas_Part.PartID = PR.PartID left join options on 1=1 
  Where PE.ordid=@ORDID and MD.SEMIFINISH ='S' and JW.Pcstype <> 'Bit' group by PE.ordid,PE.styleno,PE.WrkID,
  isNull(Allow_Excess_InBudget,'N'),Mas_Part.PartID) x     
inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno And X.StageID = a.Deptid  
AND a.PartId = X.PartID where type='PRODUCTION'  
End End
update a set a.BudgetQty =x.budgetqty ,a.BudgetAmt = a.BudgetAmt*x.budgetqty  from   (
select PE.ordid,PE.styleno,PE.WrkID As StageID, case when isNull(Allow_Excess_InBudget,'N') ='N' then 
sum(qd.OrderQty/isnull(noofpcsperbit,0)) ELSE sum(qd.CutPlanQty/isnull(noofpcsperbit,0)) END as budgetqty,Mas_Part.PartID 
from Trs_ProdExp PE  INNER JOIN OrderQtyDtl QD
ON QD.OrdID = PE.OrdId and QD.StyleNo = PE.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and 
PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID AND QD.PartID = PR.PartID LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On
 PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID and Qd.SizeId = 
 PR1.SizeId left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id      left outer join mas_dept  MD  (nolock) 
  on JW.deptid = MD.deptid  LEFT OUTER JOIN Mas_Part ON Mas_Part.PartID = QD.PartID left join options on 1 =1 Where PE.ordid=@ORDID and 
  MD.SEMIFINISH ='S' and JW.Pcstype = 'Bit' and   ISNULL(MD.ProcBill,'') <> 'K' and   isNull(NoofPcsPerBit,0) > 0 group by 
  PE.ordid,PE.styleno,PE.WrkID,NoofPcsPerBit,isNull(Allow_Excess_InBudget,'N'),Mas_Part.PartID
Union All
select PE.ordid,PE.styleno,PE.WrkID As StageID, case when isNull(Allow_Excess_InBudget,'N') ='N' then (Pro_Prod_Budget_Det.Kgs)
 ELSE (Pro_Prod_Budget_Det.Kgs) END as budgetqty,Mas_Part.PartID from Trs_ProdExp PE  INNER JOIN OrderQtyDtl QD
ON QD.OrdID = PE.OrdId and QD.StyleNo = PE.StyleNo LEFT OUTER JOIN Pro_Prod_PartwiseRate PR (nolock) On PE.OrdId = PR.OrdID and 
PE.StyleNo = PR.Styleno And PE.WrkID = PR.WrkID AND QD.PartID = PR.PartID LEFT OUTER JOIN Bud_InhRateclw PR1 (nolock) On 
PE.OrdId = PR1.OrdID and PE.StyleNo = PR1.Styleno And PE.WrkID = PR1.NWork AND QD.PartID = PR1.PartID and Qd.SizeId = PR1.SizeId 
left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id      left outer join mas_dept  MD  (nolock)  on JW.deptid = 
MD.deptid left Outer join Pro_Prod_Budget_Det on PE.ordid = Pro_Prod_Budget_Det.ordid   LEFT OUTER JOIN Mas_Part ON 
Mas_Part.PartID = QD.PartID left join options on 1 =1 Where PE.ordid=@ORDID and MD.SEMIFINISH ='S' and JW.Pcstype = 'Bit' and   
ISNULL(MD.ProcBill,'') = 'K' and   isNull(NoofPcsPerBit,0) > 0 group by PE.ordid,PE.styleno,PE.WrkID,NoofPcsPerBit,
isNull(Allow_Excess_InBudget,'N'),Mas_Part.PartID,Pro_Prod_Budget_Det.Kgs) x     
inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno And X.StageID = a.Deptid  AND 
a.PartId = X.PartID where type='PRODUCTION'  

/* PartWise Rate Production */
/* --budget qty - Finished*/    
update a set a.BudgetQty =x.budgetqty ,a.BudgetAmt = a.BudgetAmt*x.budgetqty  from    
(select PE.ordid,PE.styleno,PE.WrkID As StageID, case when isNull(Allow_Excess_InBudget,'N') ='N' then sum(QD.SizeQty) ELSE 
sum(CEILING((QD.SizeQty)+(QD.SizeQty * QD.Exs_Per/100))) END as budgetqty from Trs_ProdExp PE INNER JOIN OrdQtyClrDtl QD ON  
QD.OrdID = PE.OrdId and QD.StyleNo = PE.StyleNo left outer join mas_jobwrkcomp JW  (nolock)  on PE.wrkid  = JW.id 
left outer join mas_dept  MD  (nolock)  on JW.deptid = MD.deptid  left join options on 1= 1 Where PE.ordid=@ORDID and 
MD.SEMIFINISH ='F' group by PE.ordid,PE.styleno,PE.WrkID,isNull(Allow_Excess_InBudget,'N')) x   inner join 
Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno And X.StageID = a.Deptid where type='PRODUCTION'  
/* --actual amt*/    
select @partial = isnull(ProdbillEntryPartial,'N') from options 
 if @partial ='Y' 
BEGIN
	update a set a.actualqty = ISNULL(A.ActualQty,0) + y.qty ,a.actualAmt = ISNULL(a.ActualAmt,0) + y.amount from ( 
	select x.ordid,sum(x.qty) as qty,sum(x.amt) as Amount,x.stageid,x.StyleNo,x.PartID from (

	select  Trs_ProdBillDetNew.Ordid as ordid,isnull( (Trs_ProdBillDetNew.ThisBillQty),0) as qty ,
	 /* Swetha Trijosh isnull((Trs_ProdBillDetNew.rate*Trs_ProdBillDetNew.ThisBillQty),0) */
	  CASE WHEN @Reqd_TaxInPL='Y' THEN SUM(Trs_ProdBillDetNew.NetAmount) ELSE
 SUM(Trs_ProdBillDetNew.Amount) END as amt ,Mas_JobWrkComp.Id as stageid,Trs_ProdBillDetNew.styleno,Mas_JobWrkComp.WorkComplDet,
 IsNull(Colorid,0) as Colorid,Mas_Part.PartID from Trs_ProdBillDetNew 
inner join Mas_JobWrkComp on Mas_JobWrkComp.id=Trs_ProdBillDetNew.StageID inner join Mas_Part on Mas_Part.PartID=
Trs_ProdBillDetNew.Partid where Trs_ProdBillDetNew.Ordid=@ORDID group by Trs_ProdBillDetNew.rate,Trs_ProdBillDetNew.ThisBillQty,
Trs_ProdBillDetNew.id,Mas_JobWrkComp.WorkComplDet,Mas_JobWrkComp.Id,Trs_ProdBillDetNew.Ordid,Mas_Part.PartName,
Trs_ProdBillDetNew.styleno,IsNull(Colorid,0),Mas_Part.PartID
union all 
/* To Reduce Double Time FinDept Insertion */
Select Z.OrdID, Sum(Z.qty) As Qty , Sum(Z.amt) As Amt,Z.StageId,Z.styleno,Z.WorkComplDet,Z.Colorid,Z.PartID From (
select Distinct Trs_BillRate.ordid,isnull(SUM(Trs_BillRate.Mtr),0) as qty ,
Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then isnull(sum(Trs_BillRate.NetAmount),0) 
ELSE  ISNULL(SUM(Trs_BillRate.Mtr * Trs_BillRate.Rate),0) END as amt,Trs_BillRate.Dept As StageId,Trs_BillRate.styleno,
Mas_JobWrkComp.WorkComplDet,IsNull(Colid,0) as Colorid , Mas_Part.PartId  from Trs_BillRate inner join Mas_JobWrkComp on 
Mas_JobWrkComp.id = Trs_BillRate.Dept  Inner Join Trs_ProdExp On Trs_BillRate.OrdId=Trs_ProdExp.OrdId And 
Trs_BillRate.StyleNo=Trs_ProdExp.StyleNo  and Trs_BillRate.Dept = Trs_ProdExp.WrkID inner join Mas_dept on Mas_Dept.DeptID = 
Mas_JobWrkComp.DeptId  INNER JOIN Mas_Part ON Mas_Part.PartID = Trs_BillRate.PanelID Inner Join 
(SELECT DISTINCT Invid,OrdJob,GrnType FROM Trs_PcsGrn1) Trs_PcsGrn1 on Trs_PcsGrn1.Invid = Trs_BillRate.ID And 
Trs_PcsGrn1.OrdJob = Trs_BillRate.OrdID  where Trs_BillRate.ordid=@ORDID And Mas_Dept.OutputType='P' And 
GrnType <> 'Supplier Order Receipt'  group by Trs_BillRate.ordid,Trs_BillRate.styleno,Mas_JobWrkComp.WorkComplDet,
Trs_BillRate.Dept,IsNull(Colid,0),Mas_Part.PartId )Z GROUP BY Z.OrdID,Z.StageId,Z.styleno,Z.WorkComplDet,Z.Colorid,Z.PartID)X 
where X.Ordid=@ORDID  group by x.ordid,x.stageid,x.StyleNo,x.PartId)y		
inner join Temp_BudgetAndActual_Det a (nolock) on y.ordid=a.ordid and y.styleno= a.styleno and y.stageid= a.deptid AND y.PartId = a.PartId where type='PRODUCTION'  END
END
ELSE
BEGIN
update a set a.actualqty = IsNull(a.actualqty,0) + y.Pcs ,a.actualAmt = IsNull(a.actualAmt,0) + y.amount from (  
 select x.ordid,x.styleno,x.stageid,sum(x.Pcs) as Pcs , Sum(X.Amount)Amount,X.PARTID from ( 
 select ordid,styleno,stageid,sum(Trs_ProdentryQty.ProdPcs) as Pcs , sum(Trs_ProdentryQty.ProdPcs * isnull(Rate,0)) as amount,
 PARTID,0 As ColId  from Trs_Prodentry  inner join Trs_ProdentryQty on Trs_Prodentry.id=Trs_ProdentryQty .id  inner join  
 Trs_ProdBill on  Trs_ProdBill.id=Trs_Prodentry.brid  where ordid=@ORDID group by ordid,styleno,stageid,PARTID
 Union All 
/* To Reduce Double Time FinDept Insertion */
Select Z.OrdID,Z.styleno,Z.StageId, Sum(Z.Pcs) As Pcs, Sum(Z.amount) As Amount,Z.PartID,Z.ColId From (
 select Distinct Trs_BillRate.ordid,Trs_BillRate.styleno,Trs_BillRate.Dept As StageId,SUM(Trs_BillRate.Mtr) as Pcs , 
 ISNULL(SUM(Trs_BillRate.Mtr * Trs_BillRate.Rate),0) as amount,Mas_Part.PartID,Trs_BillRate.ColId from Trs_BillRate inner join 
 Mas_JobWrkComp on Mas_JobWrkComp.id = Trs_BillRate.Dept  
Inner Join Trs_ProdExp On Trs_BillRate.OrdId=Trs_ProdExp.OrdId And Trs_BillRate.StyleNo=Trs_ProdExp.StyleNo  and
 Trs_BillRate.Dept = Trs_ProdExp.WrkID inner join Mas_dept on Mas_Dept.DeptID = Mas_JobWrkComp.DeptId Inner Join Mas_Part
  On Mas_Part.PartID = 
Trs_BillRate.PanelID Inner Join (SELECT DISTINCT Invid,OrdJob,GrnType FROM Trs_PcsGrn1) Trs_PcsGrn1 on Trs_PcsGrn1.Invid = 
Trs_BillRate.ID And Trs_PcsGrn1.OrdJob = Trs_BillRate.OrdID where Trs_BillRate.ordid=@ORDID And Mas_Dept.OutputType='P'  And 
GrnType
 <> 'Supplier Order Receipt' group by Trs_BillRate.ordid,Trs_BillRate.styleno,Trs_BillRate.Dept,Mas_Part.PartID ,
 Trs_BillRate.ColId)Z GROUP BY  Z.OrdID,Z.styleno,Z.StageId,Z.PartID,Z.ColId
)x group by x.ordid,x.styleno,x.stageid,X.PARTID )y  
inner join Temp_BudgetAndActual_Det a (nolock) on y.ordid=a.ordid and y.styleno= a.styleno and y.stageid= a.deptid And 
y.PARTID = a.PartId where type='PRODUCTION' END
 END 
 /* PartWise Rate Production */
/* Supplier Order ActualAmt */
 Declare @ActAmt As Integer
Declare @NetAmt As Integer
Select @ActAmt = COUNT(*) from Temp_BudgetAndActual_Det  Where Type='PRODUCTION'
SELECT @NetAmt = Isnull(NetAmount,0) From Trs_BillRate
If @actAmt = 0 And @NetAmt <> 0
select @partial = isnull(ProdbillEntryPartial,'N') from options 
if @partial ='Y' 
BEGIN
/* To Reduce Double Time FinDept Insertion */
Declare @FActAmt As Integer
 Select @FActAmt = Count(*) From Temp_BudgetAndActual_Det Inner Join Mas_JobWrkComp On Mas_JobWrkComp.Id = 
 Temp_BudgetAndActual_Det.Deptid Inner Join Mas_Dept On Mas_Dept.DeptID = Mas_JobWrkComp.DeptId Where Guid =  @Guid 
 And Ordid = @ORDID And Slno = 4 And Type = 'PRODUCTION' And IsNull(SEMIFINISH,'S') = 'F'
 If @FActAmt = 0
BEGIN 
Insert into Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid,actualqty,actualAmt,Deptid,styleno,Deptname,colorid) 
select  @Guid,4,'SUPPLIER ENTRY',Trs_BillRate.ordid,isnull(Trs_BillRate.Mtr,0) as qty ,
Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then isnull(sum(Trs_BillRate.NetAmount),0) ELSE 
 sum(Trs_BillRate.Mtr * isnull(Trs_BillRate.Rate,0)) END as amt,Trs_BillRate.Dept As StageId,Trs_BillRate.styleno,
 Mas_JobWrkComp.WorkComplDet,IsNull(Colid,0) as Colorid from Trs_BillRate inner join Mas_JobWrkComp on Mas_JobWrkComp.id = 
 Trs_BillRate.Dept  Inner Join SuppOrdMas On SuppOrdMas.OrdId = Trs_BillRate.OrdID Inner Join SuppOrdStyleDtl on 
 SuppOrdStyleDtl.SuppOrdId=SuppOrdMas.SuppOrdId And Trs_BillRate.StyleNo=SuppOrdStyleDtl.StyleNo 
/* Inner Join Trs_PcsGrn1 On Trs_PcsGrn1.SuppOrdId=SuppOrdMas.SuppOrdId And  Trs_BillRate.Dept = Trs_PcsGrn1.TargetStageID*/
 inner join Mas_dept on Mas_Dept.DeptID = Mas_JobWrkComp.DeptId where (Trs_BillRate.ID = (SELECT DISTINCT invid FROM 
 Trs_PcsGrn1 Left Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id WHERE Trs_PcsGrn1.Invid = trs_billrate.id AND 
 TargetStageID = Trs_Billrate.Dept and Trs_PcsGrn1.OrdJob=trs_billrate.OrdId and Trs_PcsGrn1.OrdJob=@ORDID And 
 Trs_PcsGrn1.GrnType='Supplier Order Receipt'))
 And Mas_Dept.OutputType='P' group by Trs_BillRate.ordid,Trs_BillRate.styleno,Mas_JobWrkComp.WorkComplDet,Trs_BillRate.Dept,
 Trs_BillRate.Mtr,IsNull(Colid,0)
END 
ELSE
BEGIN 
Update Y  Set Y.ActualQty = IsNull(Y.ActualQty,0) + Z.Qty , Y.ActualAmt = IsNull(Y.ActualAmt,0) + Z.Amt From (
Select X.OrdID,X.Type,ISNULL(SUM(X.Qty),0) As Qty, ISNULL(SUM(X.Amt),0) As Amt,X.styleno,X.StageId,X.PartId From (
Select 'SUPPLIER ENTRY' As Type,Trs_BillRate.ordid,isnull(Trs_BillRate.Mtr,0) as Qty ,Case When 
/*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then isnull(sum(Trs_BillRate.NetAmount),0) ELSE  
sum(Trs_BillRate.Mtr * isnull(Trs_BillRate.Rate,0)) END as Amt,Trs_BillRate.Dept As StageId,Trs_BillRate.styleno,
Mas_JobWrkComp.WorkComplDet,IsNull(Colid,0) as Colorid,0 As PartId  from Trs_BillRate inner join Mas_JobWrkComp on 
Mas_JobWrkComp.id = Trs_BillRate.Dept  Inner Join SuppOrdMas On SuppOrdMas.OrdId = Trs_BillRate.OrdID Inner Join
 SuppOrdStyleDtl on SuppOrdStyleDtl.SuppOrdId=SuppOrdMas.SuppOrdId And Trs_BillRate.StyleNo=SuppOrdStyleDtl.StyleNo 
/* Inner Join Trs_PcsGrn1 On Trs_PcsGrn1.SuppOrdId=SuppOrdMas.SuppOrdId And  Trs_BillRate.Dept = Trs_PcsGrn1.TargetStageID*/ 
inner join Mas_dept on Mas_Dept.DeptID = Mas_JobWrkComp.DeptId where (Trs_BillRate.ID = (SELECT DISTINCT invid FROM Trs_PcsGrn1 
Left Join Trs_PcsGrn3 On Trs_PcsGrn1.Id=Trs_PcsGrn3.Id WHERE Trs_PcsGrn1.Invid = trs_billrate.id AND TargetStageID = 
Trs_Billrate.Dept and Trs_PcsGrn1.OrdJob=trs_billrate.OrdId and Trs_PcsGrn1.OrdJob=@ORDID And 
Trs_PcsGrn1.GrnType='Supplier Order Receipt'))
 And Mas_Dept.OutputType='P' group by Trs_BillRate.ordid,Trs_BillRate.styleno,Mas_JobWrkComp.WorkComplDet,Trs_BillRate.Dept,
 Trs_BillRate.Mtr,IsNull(Colid,0)) X Group By X.OrdID,X.Type ,X.styleno,X.StageId,X.PartId  ) Z
Inner Join Temp_BudgetAndActual_Det Y (nolock) ON Y.Ordid = Z.Ordid	And Y.styleno = Z.styleno And Y.Deptid = Z.StageId And 
Y.PartId = Z.PartId
END
END
/* --Piece form Details*/
 insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,styleno,BudgetQty,BudgetAmt )  
select @Guid,5,'PCS FORM', Pro_ProdPros.ordid ,ProdPros,deptname,Pro_ProdPros.styleno,sum(qty)  as qty,sum(Qty*rate) as Amt   
from Pro_ProdPros inner join MAs_dept (nolock) on Pro_ProdPros.ProdPros  =MAs_dept.DeptID  
INNER JOIN OrderMas ON Pro_ProdPros.Ordid = OrderMas.Ordid  where Pro_ProdPros.ordid=@ORDID and  rate >0 group by
 Pro_ProdPros.ordid ,ProdPros,    deptname,Pro_ProdPros.styleno  
if @GblCode= 238
update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from (select ordid,dept,styleno,sum(mtr) as kgs,sum(Amt) as netamount 
from trs_billrate inner join Trs_BillAddded on Trs_BillAddded.id = Trs_BillRate.id inner join Mas_AddDed on 
Mas_AddDed.AddDedCode = Trs_BillAddded.Adddedcode Where Mas_AddDed.AddDedName = 'Gross Amount' and Grp = 4 
group by ordid,dept,styleno) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid and 
a.styleno=b.styleno  inner join MAs_dept as c(nolock)
on b.deptid=c.deptid where               b.ordid=@ORDID and slno=5  
else
update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from      (select ordid,dept,styleno,sum(mtr) as kgs,Case When 
/*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then sum(netamount) Else Sum(Amount) end as netamount 
from trs_billrate group by ordid,dept,styleno) a   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.dept=b.deptid
 and a.styleno=b.styleno  inner join MAs_dept as c(nolock)  on b.deptid=c.deptid where   b.ordid=@ORDID and slno=5  
 ----aslam update 
/* Declare @InHouseDataCount as integer
Select @InHouseDataCount =Count(*) from Temp_BudgetAndActual_Det  Where Type='INHOUSE PRODUCTION'
if @InHouseDataCount =0   Begin   update a set a.actualqty =x.Pcs ,a.actualAmt = X.amount from 
( select ordid,styleno,stageid,sum(Trs_ProdentryQty.ProdPcs) as Pcs , sum(Trs_ProdentryQty.ProdPcs * isnull(Rate,0)) as amount from Trs_Prodentry inner join Trs_ProdentryQty on Trs_Prodentry.id=Trs_ProdentryQty .id  inner join  Trs_ProdBill on  Trs_ProdBi
ll.id=Trs_Prodentry.brid where ordid= @ORDID group by ordid,styleno,stageid  )x  inner join Temp_BudgetAndActual_Det a (nolock) on x.ordid=a.ordid and x.styleno= a.styleno INNER JOIN Mas_JobWrkComp c on X.StageID = c.ID  and c.DeptID= a.deptid where type=
'PCS FORM'   end    -------aslam */
  update b set b.ActualQty= a.kgs ,b.actualamt=a.netamount from    (select Y.ordid,departmentid as Dept,Y.styleno,    
  IsNull(Sum(Y.ProdPcs),0) as kgs, sum(Wages) as netamount    from Wages_ProductionMas X INNER JOIN Wages_ProductionDet Y ON
   X.MasSlno = Y.DetSlno INNER JOIN OrderMas ON Y.Ordid = OrderMas.OrdID group by Y.ordid,departmentID,Y.styleno) a  
   inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid AND a.styleno=b.styleno  inner join Mas_JobWrkComp as c(nolock)  
   on b.Deptid=c.id and a.Dept = c.DeptId Where  b.ordid=@ORDID and slno=4    

/* Production Shift Wages */
/*Chandru add Partid in left join */
update b set b.actualamt = IsNull(b.ActualAmt,0) + a.netamount from    (select Y.ordid,StageId ,Y.styleno,    sum(ShiftWages) 
as netamount,PartId     from Trs_ProdShiftWages Y INNER JOIN OrderMas ON Y.Ordid = OrderMas.OrdID group by Y.ordid,StageId,
Y.styleno,PartId) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.StageId=b.deptid and a.styleno=b.styleno
 and a.PartId = b.PartId  Where  b.ordid=@ORDID and slno=4  
 /*inner join MAs_dept as c(
nolock)  on b.deptid=c.deptid*/
 /*semifinsihed*/
update b set b.actualamt = IsNull(b.ActualAmt,0) + a.netamount from    (select Y.ordid,StageId ,Y.styleno,    
sum(ShiftWages) as netamount,PartId     from Trs_ProdWages Y INNER JOIN OrderMas ON Y.Ordid = OrderMas.OrdID 
group by Y.ordid,StageId,Y.styleno,y.PartId ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and 
a.StageId=b.deptid and a.styleno=b.styleno and a.PartId = b.PartId   Where  b.ordid=@ORDID and slno=4 and b.PartDesc <> 'All'
  /*inner join MAs_dept as c(nolock)  on b.deptid=c.deptid */
/*finsihed*/
update b set b.actualamt = IsNull(b.ActualAmt,0) + a.netamount from    (select Y.ordid,StageId ,Y.styleno,    
sum(ShiftWages) as netamount    from Trs_ProdWages Y INNER JOIN OrderMas ON Y.Ordid = OrderMas.OrdID group by 
Y.ordid,StageId,Y.styleno ) a  inner join Temp_BudgetAndActual_Det  b on a.ordid=b.ordid and a.StageId=b.deptid and 
a.styleno=b.styleno   Where  b.ordid=@ORDID and slno=4 and b.PartDesc = 'All' 
/* --update commercial Details*/   
Select @OrdQty= isnull(sum(orderqtydtl.orderqty),0)  from orderqtydtl INNER JOIN OrderMas ON OrderQtyDtl.Ordid = 
OrderMas.Ordid   Where OrderMas.ordid=@ORDID  Select @OrdExsQty = isnull(sum(CutPlanQty ),0) From orderqtydtl INNER JOIN 
OrderMas ON OrderQtyDtl.Ordid = OrderMas.Ordid where OrderMas.ordid=@ORDID select @Salerate =
ISNULL(Sum(OrderQtyDtl.CutPlanQty * SaleRate * isnull(Crate,0)),0)  from OrderMas(nolock) Inner Join 
OrderQtyDtl(nolock) on OrderMas.OrdId = OrderQtyDtl.OrdID    Where OrderMas.Ordid =@ORDID     
insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,comid,BudgetQty,BudgetAmt )  
select @Guid,6,'COMMERCIAL DETAILS',ordid,-2,'COMMERCIAL',comid ,case when IsNull(Allow_Excess_InBudget,'N') ='Y' 
then  @OrdExsQty ELSE @OrdQty END,Total  as BudgetAmt   from PRo_BudCommercial INNER JOIN  
 dbo.Mas_Commercial ON dbo.PRo_BudCommercial.ComID = dbo.Mas_Commercial.ID  LEFT JOIN Options ON 1 =1 
where ordid=@ORDID  
update a set a.Actualamt=  x.billamt     from      (select ShippingBill_det.ordid ,commid as comid, 
Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then sum(isnull(BillAmount,0)+isnull(TaxAmt,0))
 ELSE sum(BillAmount) END  as
 billamt  from ShippingBill (nolock) inner join ShippingBill_det(nolock) on ShippingBill.id =ShippingBill_det.cid 
  INNER JOIN ORderMas ON
ShippingBill_det.ordid = OrderMas.OrdId  where ShippingBill_det.ordid=@ORDID group by ShippingBill_det.ordid ,commid)x 
inner join Temp_BudgetAndActual_Det a on x.ordid=a.ordid and x.comid=a.comid  where a.ordid=@ORDID and guid=@Guid  
/*--Update Despatch qty as actual qty in commercial*/
/*Swetha Prime*/

 SELECT @Despatchqty=ISNULL(SUM(Trs_Pcs2.Pcs), 0) FROM  Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID 
 INNER JOIN OrderMas INNER JOIN (SELECT Distinct OrdID,StyleNo,ColID,SizeId,StyleID FROM OrderQtyDtl)OrderQtyDtl ON
  OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  AND Trs_Pcs2.StyleNo 
= OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND
 Trs_Pcs2.StyleID = OrderQtyDtl.StyleID  WHERE (OrderMas.OrdId = @ORDID) AND (Trs_Pcs1.DelType = 'Despatch') 
update Temp_BudgetAndActual_Det set ActualQty =@Despatchqty where ordid=@ORDID and guid=@Guid and slno=6 and 
isnull(ActualQty ,0)=0  update a set Actualamt= isnull(Actualamt,0)+billamt from   
 (select  trs_expenses.ordid ,expid ,isnull(sum(Amount),0) as 
billamt  from trs_expenses  where trs_expenses.ordid=@ORDID  group by trs_expenses.ordid ,expid) x 
inner join Temp_BudgetAndActual_Det a on x.ordid=a.ordid and x.expid=a.comid  where a.ordid= @ORDID  and 
guid=@Guid and billamt>0    
/*--taking from expenses entry*/    
insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,comid,Actualamt)  
(select @Guid,6,'COMMERCIAL DETAILS', trs_expenses.ordid ,-2,'COMMERCIAL',expid ,sum(Amount) as billamt  from trs_expenses  
where trs_expenses.ordid=@ORDID and  expid not in(select distinct comid from Temp_BudgetAndActual_Det where Slno=6 and 
guid=@Guid) group by trs_expenses.ordid ,expid) 
/*--taking from CASH expenses entry*/    
insert into  Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,comid,Actualamt)  
(select @Guid,7,'CASH EXPENSE DETAILS', ordid ,-2,'COMMERCIAL',expenseid ,sum(Amount) as billamt  from Trs_CashExpenses1 A 
INNER JOIN Trs_CashExpenses2 B ON A.ID = B.ID   INNER JOIN Mas_Commercial MC ON A.ExpenseId = MC.Id where B.ordid=@ORDID and 
 expenseid not in(select distinct comid from Temp_BudgetAndActual_Det where Slno=6 and guid=@Guid) group by ordid ,expenseid) 
/*--Unplanned Process Bills entry*/ 

insert into Temp_BudgetAndActual_Det (Guid ,Slno ,Type ,Ordid ,Deptid ,Deptname,fabid ,cntid ,colorid ,Acctypeid ,Accdesc ,
sizedesc ,ActualQty,ActualAmt)   

select Distinct @Guid, case when OutputType ='Y'  then 1  else  case when OutputType ='F' then 2  else  
case when OutputType ='-' then 3 end  end end as Slno ,  case when OutputType ='Y'  then 'YARN DETAILS'   else  
case when OutputType ='F' then 'FABRIC 
DETAILS'   else case when OutputType ='-' then 'ACCESSORY DETAILS' end end end as        type,     
ordid,deptid,deptname ,fabid,Cntid ,ColId ,Atype ,ades ,Asiz ,trs_billrate.Kgs ,Case When 
/*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then (Trs_BillRate.netamount) Else (Trs_BillRate.Amount)
 end as netamount   from trS_billrate(nolock) inner join trs_bills (nolock) on trS_billrate.id=trs_bills.id  
 inner join Trs_BillAddded on Trs_BillRate.Id = Trs_BillAddded.id inner join Mas_AddDed on Mas_AddDed.AddDedCode =
  Trs_BillAddded.Adddedcode  inner join MAs_dept (nolock) on trS_billrate.dept=MAs_dept.DeptID   
   where Ordid =@ORDID and type in ('YF','AC') and Mas_AddDed.AddDedName = 'Gross Amount' and trs_billrate.dept not in 
   (select deptid from Temp_BudgetAndActual_Det where ordid=@ORDID and guid=@Guid)   
--Budget and Actual Abs information
Declare     @ExpSalesAct numeric(18,3),@ExpSalesbud numeric(18,3),    @ProcessBud numeric(18,3),   
@ProcessAct numeric(18,3),     @ProdBud numeric(18,3), @ProdAct numeric(18,3),  @BudProdOH  numeric(18,3) ,  @BudDDB numeric(18,3) , @BudComm numeric(18,3),
@Crate numeric(9,3),  @SalesCommBud numeric(18,3),@SalesCommAct numeric(18,3),  @DDBBud numeric(18,3), @DDBAct numeric(18,3),    
 @CommBud numeric(18,3),@CommAct numeric(18,3),   @FabricBudAmt Numeric(18,3),@FabricActAmt Numeric(18,3),  
  @AccBudAmt Numeric(18,3),@AccActAmt Numeric(18,3) ,  @PrdnBudAmt Numeric(18,3),@PrdnActAmt Numeric(18,3),  
  @OrderQtyWithExcess Numeric(18,2),@ShippedQty Numeric(18,2), @OrderQtyWithOutExcess Numeric(18,0),@TotalCutPcs Numeric(18,0), 
  @InHouseCutPcs Numeric(18,0),@PceFormCutPcs Numeric(18,0), @OrderQty_FORSET Numeric(18,0),@ShippedQty_FORSET Numeric(18,0) 
  Select @BudComm=isnull(Bud_Buycomm,0) , @BudDDB=isnull(Bud_ddb,0) ,@BudProdOH=isnull(ProdOverheads,0) , @Crate=isnull(crate,0)
    from ordermas INNER JOIN OrderMas2 
	ON OrderMas.Ordid = OrderMas2.Ordid where OrderMas.ordid=@ORDID     Select @ExpSalesbud= 
	ISNULL(Sum(OrdQtyClrDtl.SizeQty * SaleRate * isnull(Crate,0)),0) from OrderMas Inner Join OrdQtyClrDtl on 
	OrderMas.OrdId = OrdQtyClrDtl.OrdID Where OrderMas.Ordid= @ORDID  
/*   SELECT    @ExpSalesAct= ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs2.Rate * Case When IsNull(OrderMas.CRate,0) = 0 then ISNULL(Trs_Pcs2.Crate, 0)  Else OrderMas.ActCRate End ), 0)  FROM  Trs_Pcs1 INNER JOIN Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN Orde
rMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND Trs_Pcs2.StyleID = Order
QtyDtl.StyleID WHERE     (OrderMas.OrdId = @ORDID ) AND (Trs_Pcs1.DelType = 'Despatch')   
As per Mr.Muthusamy sir instruction following query changed as Crate from Despatch table on 02-Jul-2014 */
SELECT @DespatchCheckPoint = IsNull(DesEntry,'N') FROM Options 
if RTrim(@DespatchCheckPoint)='N'
BEGIN
if @currencyflg='Y' 
begin
SELECT    @ExpSalesAct=  ISNULL(SUM(Trs_Pcs2.Pcs * OrdQtyClrDtl.SaleRate * @currency ), 0) FROM  Trs_Pcs1 INNER JOIN   
 Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN (Select Ordid,Styleno,CmbClrID ,SizeId,SaleRate,styleId 
 From OrdQtyClrDtl WHERE ORdid=@ORDID Group by Ordid,Styleno,CmbClrID ,SizeId,SaleRate,styleId) OrdQtyClrDtl ON OrderMas.OrdId =
  OrdQtyClrDtl.OrdID ON Trs_Pcs1.Ordjobno 
= OrderMas.OrdId  AND Trs_Pcs2.StyleNo = OrdQtyClrDtl.StyleNo AND Trs_Pcs2.SizeID = OrdQtyClrDtl.SizeId AND 
Trs_Pcs2.StyleID = OrdQtyClrDtl.StyleID 
 and trs_Pcs2.ColID = OrdQtyClrDtl.CmbClrID  WHERE     (OrderMas.OrdId = @ORDID ) AND (Trs_Pcs1.DelType = 'Despatch')
AND IsNull(Ship_sample,'') = '' and  ISNULL(Trs_Pcs1.Despatch_Type,'D') ='D'
 SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 
 ON Trs_Pcs1.ID = Trs_Pcs2.ID Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno  WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 
 AND Trs_Pcs1.Ordjobno = @ORDID and Ordermas.OrderType ='Job'
 SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs2.Rate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno  WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 
 AND Trs_Pcs1.Ordjobno = @ORDID and Ordermas.OrderType <>'Job'
end
else
begin
SELECT    @ExpSalesAct=  ISNULL(SUM(Trs_Pcs2.Pcs * OrdQtyClrDtl.SaleRate * Case When IsNull(Trs_Pcs2.Crate,0) = 0 
then ISNULL(OrderMas.CRate, 0) ELSE IsNull(Trs_Pcs2.Crate,0)  End ), 0) FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON 
Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN (Select Ordid,Styleno,CmbClrID ,SizeId,SaleRate,styleId 
From OrdQtyClrDtl WHERE ORdid=@ORDID Group by Ordid,Styleno,CmbClrID ,SizeId,SaleRate,styleId) OrdQtyClrDtl 
ON OrderMas.OrdId = OrdQtyClrDtl.OrdID ON Trs_Pcs1.Ordjobno 
= OrderMas.OrdId  AND Trs_Pcs2.StyleNo = OrdQtyClrDtl.StyleNo AND Trs_Pcs2.SizeID = OrdQtyClrDtl.SizeId AND Trs_Pcs2.StyleID = 
OrdQtyClrDtl.StyleID   and trs_Pcs2.ColID = OrdQtyClrDtl.CmbClrID WHERE     (OrderMas.OrdId = @ORDID ) AND 
(Trs_Pcs1.DelType = 'Despatch') AND IsNull(Ship_sample,'') = ''  and  ISNULL(Trs_Pcs1.Despatch_Type,'D') ='D'
SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 
ON Trs_Pcs1.ID = Trs_Pcs2.ID Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno  WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 
AND Trs_Pcs1.Ordjobno = @ORDID and Ordermas.OrderType ='Job'
 SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs2.Rate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno  WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0
  AND Trs_Pcs1.Ordjobno = @ORDID and Ordermas.OrderType <> 'Job'
end
END
ELSE
BEGIN
if @currencyflg='Y' 
begin
SELECT    @ExpSalesAct=  ISNULL(SUM(Trs_Pcs2.Pcs * OrdQtyClrDtl.SaleRate * @currency ), 0) FROM  Trs_Pcs1 INNER JOIN    
Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID 
INNER JOIN OrderMas INNER JOIN OrdQtyClrDtl ON OrderMas.OrdId = OrdQtyClrDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  
AND Trs_Pcs2.StyleNo = OrdQtyClrDtl.StyleNo AND Trs_Pcs2.SizeID = OrdQtyClrDtl.SizeId AND Trs_Pcs2.StyleID = 
OrdQtyClrDtl.StyleID 
 and trs_Pcs2.ColID = OrdQtyClrDtl.CmbClrID and trs_Pcs2.Lotno = OrdQtyClrDtl.Lotno WHERE     (OrderMas.OrdId = @ORDID ) 
 AND (Trs_Pcs1.DelType = 'Despatch') AND IsNull(Ship_sample,'') = '' and  ISNULL(Trs_Pcs1.Despatch_Type,'D') ='D'
 SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID  Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno  WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 
 AND Trs_Pcs1.Ordjobno = @ORDID and Ordermas.OrderType = 'Job'
 SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs2.Rate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID  Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno  WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 
 AND Trs_Pcs1.Ordjobno = @ORDID and Ordermas.OrderType <> 'Job'
end
else
begin
 SELECT    @ExpSalesAct=  ISNULL(SUM(Trs_Pcs2.Pcs * OrdQtyClrDtl.SaleRate * Case When IsNull(Trs_Pcs2.Crate,0) = 0 then 
 ISNULL(OrderMas.CRate, 0) ELSE IsNull(Trs_Pcs2.Crate,0)  End ), 0) FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = 
 Trs_Pcs2.ID 
INNER JOIN OrderMas INNER JOIN OrdQtyClrDtl ON OrderMas.OrdId = OrdQtyClrDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId 
 AND Trs_Pcs2.StyleNo = OrdQtyClrDtl.StyleNo AND Trs_Pcs2.SizeID = OrdQtyClrDtl.SizeId AND Trs_Pcs2.StyleID = 
 OrdQtyClrDtl.StyleID 
 and trs_Pcs2.ColID = OrdQtyClrDtl.CmbClrID and trs_Pcs2.Lotno = OrdQtyClrDtl.Lotno WHERE     (OrderMas.OrdId = @ORDID ) 
 AND (Trs_Pcs1.DelType = 'Despatch') AND IsNull(Ship_sample,'') = '' and  ISNULL(Trs_Pcs1.Despatch_Type,'D') ='D'
SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs1.JRate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
Trs_Pcs1.ID = Trs_Pcs2.ID Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno   WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 AND 
Trs_Pcs1.Ordjobno = @ORDID  and Ordermas.OrderType = 'Job'
 SELECT    @ExpSalesAct=@ExpSalesAct +  ISNULL(SUM(Trs_Pcs2.Pcs * Trs_Pcs2.Rate),0)  FROM Trs_Pcs1 INNER JOIN Trs_Pcs2 ON 
 Trs_Pcs1.ID = Trs_Pcs2.ID Inner join Ordermas on Ordermas.ordid = trs_pcs1.Ordjobno   WHERE ISNULL(Trs_Pcs1.InvID, 0) <> 0 AND 
 Trs_Pcs1.Ordjobno = @ORDID  and Ordermas.OrderType <> 'Job'
end
END 
 --Case When OrderMas.EntryOption='2' And IsNull(OrderMas.PcePerPack,1) > 1 THEN 
Select @OrderQty_FORSET = ISNULL(Sum(SizeQty),0) from OrderMas Inner Join OrdQtyClrDtl ON OrderMas.OrdId = OrdQtyClrDtl.OrdID
 Where OrderMas.Ordid= @ORDID Select @OrderQtyWithOutExcess=    ISNULL(Sum(OrderQtyDtl.OrderQty),0)  from OrderMas 
 Inner Join OrderQtyDtl on OrderMas.OrdId = OrderQtyDtl.OrdID Where	  OrderMas.Ordid= @ORDID Select @OrderQtyWithExcess=   
 ISNULL(Sum(OrderQtyDtl.CutPlanQty),0)  from OrderMas Inner Join OrderQtyDtl on OrderMas.OrdId = OrderQtyDtl.OrdID Where	        
  OrderMas.Ordid= @ORDID SELECT    @InHouseCutPcs= ISNULL(SUM(ProdPcs), 0) FROM  Trs_ProdEntry INNER JOIN  
  Trs_ProdEntryQty ON Trs_ProdEntry.ID = Trs_ProdEntryQty.ID  WHERE     (Trs_ProdEntry.OrdId = @ORDID ) AND (StageID=1) 
/*SELECT    @PceFormCutPcs=  ISNULL(SUM(Trs_Pcs2.Pcs), 0) FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID WHERE     (OrdJobNo = @ORDID ) AND (Trs_Pcs1.DelType = 'Process') and Dept =11 */
Select @PceFormCutPcs= ISNULL(SUM(Trs_PcsGRN2.RecPcs),0) From Trs_PcsGRN1 INNER JOIN Trs_PcsGrn2 ON Trs_PcsGrn1.ID = 
Trs_PcsGrn2.ID WHERE  (OrdJob = @ORDID ) AND ProcessType = 'P' AND Dept =11 And TargetStageID = 1
SELECT @TotalCutPcs = @InHouseCutPcs + @PceFormCutPcs
SELECT @ShippedQty = ISNULL(SUM(Trs_Pcs2.Pcs), 0) FROM  Trs_Pcs1 INNER JOIN    Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID 
INNER JOIN OrderMas INNER JOIN OrderQtyDtl ON OrderMas.OrdId = OrderQtyDtl.OrdID ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  
AND Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId 
AND Trs_Pcs2.StyleID = OrderQtyDtl.StyleID   WHERE     (OrderMas.OrdId = @ORDID ) AND (Trs_Pcs1.DelType = 'Despatch')
SELECT   @ShippedQty_FORSET= ISNULL(SUM(Trs_Pcs2.Pcs)/IsNull(OrderStyleDtl.PcePerPack,1), 0)  FROM  Trs_Pcs1 INNER JOIN    
Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER JOIN OrderMas INNER JOIN OrderStyleDtl ON OrderStyleDtl.OrdID = OrderMas.OrdId 
INNER JOIN OrderQtyDtl ON OrderMas.OrdId 
= OrderQtyDtl.OrdID AND OrderStyleDtl.StyleNo = OrderQtyDtl.StyleNo ON Trs_Pcs1.Ordjobno = OrderMas.OrdId  AND 
Trs_Pcs2.StyleNo = OrderQtyDtl.StyleNo AND Trs_Pcs2.ColID = OrderQtyDtl.ColID AND Trs_Pcs2.SizeID = OrderQtyDtl.SizeId AND 
Trs_Pcs2.StyleID = OrderQtyDtl.StyleID 	WHERE     (OrderMas.OrdId = @ORDID ) AND (Trs_Pcs1.DelType = 'Despatch') 
GROUP BY OrderStyleDtl.PcePerPack
/*  Select @ProcessBud =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (1,2)     /*,3,4,5*/
 Select @ProcessBud = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN  isnull(sum(BudgetAmt/IsNull(OrderMas.PcePerPack,1)),0) ELSE isnull(sum(BudgetAmt),0) END from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_Bu
dgetAndActual_Det.Ordid = OrderMas.Ordid  Where slno in (3,4,5) group by     OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) Select @ProcessAct = isnull(sum(ActualAmt),0) from Temp_BudgetAndActual_Det where slno in (1,2)    /*,3,4,5*/Select @ProcessAct
=  CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN  isnull(sum(ActualAmt / IsNull(OrderMas.PcePerPack,1)),0) ELSE isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ord
id = OrderMas.Ordid  Where slno in (3,4,5)    Group by     OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) Select @ProdBud = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN isnull(sum(BudgetAmt/ IsNull(OrderMas.PcePerPack,
1)),0) ELSE isnull(sum(BudgetAmt),0) END from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid   where slno in (4,5)    Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) Select @ProdAct= CASE WHEN 
OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN isnull(sum(ActualAmt/IsNull(OrderMas.PcePerPack,1)),0) ELSE isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ord
id where slno in (4,5)    Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) Select @FabricBudAmt =isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det where slno in (1,2)  Select @FabricActAmt = isnull(sum(ActualAmt),0) from Temp_BudgetAndAct
ual_Det where slno in (1,2) Select @AccBudAmt = CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN isnull(sum(BudgetAmt/IsNull(OrderMas.PcePerPack,1)),0) ELSE
isnull(sum(BudgetAmt),0) END     from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid   Where slno in (3)    Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) Select @AccActAmt = CASE WHEN OrderMa
s.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN isnull(sum(ActualAmt / IsNull(OrderMas.PcePerPack,1)),0) 
ELSE isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid Where slno in (3)   Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) SELECT @PrdnBudAmt = CASE WHEN OrderMas.
EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN isnull(sum(BudgetAmt/IsNull(OrderMas.PcePerPack,1)),0) ELSE isnull(sum(BudgetAmt),0) END from  Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid   WHE
RE slno in (4,5) Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) SELECT @PrdnActAmt= CASE WHEN OrderMas.EntryOption='2' AND IsNull(OrderMas.PcePerPack,1) > 1 THEN isnull(sum(ActualAmt/IsNull(OrderMas.PcePerPack,1)),0) ELSE
isnull(sum(ActualAmt),0) END from Temp_BudgetAndActual_Det INNER JOIN ORderMas ON Temp_BudgetAndActual_Det.Ordid = OrderMas.Ordid    WHERE slno in (4,5) Group by OrderMas.EntryOption,IsNull(OrderMas.PcePerPack,1) */

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
 select @ProdBud = (@BudProdOH / 100) * @ProdBud    select      @ProdAct = (@OverHeads / 100) * @ProdAct
 /*select    @SalesCommBud = (@BudComm / 100) * @ExpSalesBud  Swetha 04-11-2024*/
 select    @SalesCommBud = (@Buyercomm / 100) * @ExpSalesBud 
 select   @SalesCommAct = (@Buyercomm / 100) * @ExpSalesAct 
 /*select  @DDBBud = (@BudDDB / 100) * @ExpSalesBud  Swetha 04-11-2024*/
  select  @DDBBud = (@DDB / 100) * @ExpSalesBud  
 declare     @Income  numeric(18,3),     @Expence numeric(18,3) 
 declare     @CashExp  numeric(18,3)
/*select @DDBAct = (@DDB/ 100) * (@ExpSalesAct - @SalesCommAct) Swetha Changed By MD Piper TicketNo - 2687*/
 select @DDBAct = (@DDB/ 100) * (@ExpSalesAct)
 select @Income= isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on 
 Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and MAs_commercial.type='+'    
 select @Expence = isnull(sum(BudgetAmt),0) from  Temp_BudgetAndActual_Det(nolock) inner join MAs_commercial(nolock) on 
 Temp_BudgetAndActual_Det.comid=Mas_Commercial .id    where slno=6 and MAs_commercial.type='-'    
 select @CommBud = @Expence - @Income 
select @Income = isnull(sum(ActualAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on 
Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and MAs_commercial.type='+'   
 select @Expence =isnull(sum(ActualAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on 
 Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and Mas_Commercial.type='-'     
 select @Income = isnull(sum(ActualAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on 
 Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=6 and MAs_commercial.type='+'   
select @CashExp = isnull(sum(ActualAmt),0) from  Temp_BudgetAndActual_Det (nolock) inner join MAs_commercial(nolock) on 
Temp_BudgetAndActual_Det.comid=Mas_Commercial .id where slno=7 and MAs_commercial.type='-'   
select  @CommAct = @Expence  - @Income     declare     @DebitValueAct numeric(18,3),    @Stockvalue numeric(18,3),
 @dirdebval  numeric(18,3),  @dircreval  numeric(18,3)  
 SET @CommAct = @CommAct + @CashExp
--Fabric
Select @DebitValueAct= Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then
 isnull(sum(Trs_Deb2.netamt),0)  Else Isnull(Sum(DebMtr * Trs_Deb2.Rate),0) End From Trs_Deb1 Inner join Trs_Deb2 On 
 Trs_Deb1.Id = Trs_Deb2.Id Inner Join StockTable 
On Trs_Deb2.StockID = StockTable.StockID Inner Join Mas_Fabric On StockTable.FabID =   Mas_Fabric.FabID Inner join Mas_Uom 
On Mas_Fabric.PriUomID = Mas_Uom.UomID Where (Typ = '1.Purchase' Or (Typ = '2.Process' AND Trs_Deb1.Dept = 4)) AND 
UOM <> 'KGS' AND StockTable.YF = 'F' AND Trs_Deb2.Ordid = @ORDID  
Select @DebitValueAct = @DebitValueAct + 
Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' then isnull(sum(Trs_Deb2.netamt),0) 
Else Isnull(Sum(DebKg * Trs_Deb2.Rate),0) end 
 From Trs_Deb1 Inner join Trs_Deb2 On Trs_Deb1.Id = Trs_Deb2.Id Inner Join StockTable On Trs_Deb2.StockID = StockTable.StockID 
 Inner Join  Mas_Fabric On StockTable.FabID = Mas_Fabric.FabID Inner join Mas_Uom On Mas_Fabric.PriUomID = Mas_Uom.UomID 
LEFT JOIN (Select Distinct ID,Sum(Amt) as NEtAmt from Trs_DebAddDed Where AdddedCode=2 and ID in 
(Select Distinct a.ID from trs_Deb1 a  inner join trs_deb2 B ON a.id = b.id Where B.ORdid = @ORDID) Group by ID) X ON 
Trs_Deb1.ID = X.ID and Trs_Deb2.ID = X.ID
Where (Not((Typ = '1.Purchase' Or (Typ = '2.Process' AND Trs_Deb1.Dept = 4))AND UOM <> 'KGS')) AND StockTable.YF = 'F'   
AND  Trs_Deb2.Ordid = @ORDID  
 /* --yarn and acc*/   
 select @DebitValueAct = @DebitValueAct + Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y'
  then isnull(sum(Trs_Deb2.netamt),0) ELSE (Isnull(Sum(DebKg * Trs_Deb2.Rate),0)) END From Trs_Deb1 Inner join Trs_Deb2 On 
  Trs_Deb1.Id = Trs_Deb2.Id Inner Join StockTable On Trs_Deb2.StockID = StockTable.StockID Where StockTable.YF <> 'F' AND   
   Trs_Deb2.Ordid = @ORDID   
 Select  @DebitValueAct = @DebitValueAct + Case When /*(Select Isnull(Reqd_TaxINPL,'Y') From Options)*/@Reqd_TaxInPL='Y' 
 then isnull(sum(Trs_Deb3.netamt),0) ELSE  Isnull(Sum(DebQty * Rate),0) END From Trs_Deb1 Inner Join Trs_Deb3 On Trs_Deb1.ID = 
 Trs_Deb3.ID Where  Trs_Deb3.Ordid = @ORDID 

 /* -- Commercial*/
 Select @DebitValueAct = @DebitValueAct + 
Case When @Reqd_TaxInPL='Y' then isnull(sum(X.netamt),0) 
Else Isnull(Sum(Amount),0) end 
 From Trs_Deb1 Inner join Trs_Deb4 On Trs_Deb1.Id = Trs_Deb4.Id Inner Join Mas_Commercial On Mas_Commercial.ID=Trs_Deb4.CID
LEFT JOIN (Select Distinct ID,Sum(Amt) as NEtAmt from Trs_DebAddDed Where AdddedCode=2 and ID in 
(Select Distinct a.ID from trs_Deb1 a  inner join trs_deb4 B ON a.id = b.id Where B.ORdid = @ORDID and Typ ='5.Commercial') Group by ID) X ON 
Trs_Deb1.ID = X.ID and Trs_Deb4.ID = X.ID Where Trs_Deb4.Ordid = @ORDID and Typ ='5.Commercial'
/* stock value updated */    
/* Nasima On 31-Jan-2018 (Instead Of Vue_StockAbs -> CurrentStock Tbl Is Used) */
/* SELECT @Stockvalue= isnull(SUM(Vue_StockAbs.Kg * StockRate.Rate),0)  FROM Vue_StockAbs INNER JOIN StockTable ON Vue_StockAbs.StockID = StockTable.StockID INNER JOIN StockRate ON StockTable.StockID = StockRate.StockId INNER JOIN Mas_Dept ON StockTable.D
ept = Mas_Dept.DeptID where StockRate.OrdId=@ORDID   */
SELECT @Stockvalue= isnull(SUM(CurrentStock.Kg * StockRate.Rate),0)  FROM CurrentStock INNER JOIN StockTable ON 
CurrentStock.StockID = StockTable.StockID INNER JOIN StockRate ON StockTable.StockID = StockRate.StockId INNER JOIN 
Mas_Dept ON StockTable.Dept
= Mas_Dept.DeptID where StockRate.OrdId=@ORDID    
Select @Stockvalue= @Stockvalue + ISNULL(SUM(Kg * Rate),0) from StockRate where StockRate.OrdId= @ORDID  and 
(Colordesc is not null or colordesc<>0)    
/* --direct Debit/credit value added here*/    
 select @dirdebval = Case When @Reqd_TaxInPL='Y' then isnull(sum(NetAmt),0) Else  isnull(sum(DebQty* Rate),0) END from 
 trs_directdeb1 inner join trs_directdeb2 on trs_directdeb1.id=trs_directdeb2.id  where type='D' and 
 trs_directdeb2.ordid=@ORDID 
select @dircreval= Case When @Reqd_TaxInPL='Y' then isnull(sum(NetAmt),0) ELSE isnull(sum(DebQty* Rate),0) END from 
trs_directdeb1 inner join trs_directdeb2 on trs_directdeb1.id=trs_directdeb2.id  where type='C' and 
trs_directdeb2.ordid=@ORDID   declare   @DescBud varchar(100), 
 @DescAct varchar(100),  @Despatch_Rate decimal(5,0)
/*-- select @DescBud= @OrdQty + '*' + ((@ExpSalesBud / @OrdQty) / @Crate) +'*' + @Crate    
--  If @currency = 0 
-- begin    
--  select @DescAct = convert (varchar,@DespatchQty + '*' + ((@ExpSalesAct / @DespatchQty) / @Despatch_Rate )+ '*' + @Despatch_Rate) 
-- end  
--  Else 
--begin 
--         select @DescAct = @DespatchQty + '*' + ((@ExpSalesAct / @DespatchQty) / @currency )+ '*' + @currency    
--end */ 
 select @DescBud='Budget'     select @DescAct='Actual'   insert into Temp_BudgetAndActualAbs
 (guid ,ExpSalBudgetAmt,ExpSalActualAmt,PrsBudgetAmt,PrsActualAmt,DDBudgetAmt ,DDBActualAmt,ProdBudgetOHAmt,ProdActOHAmt ,
 BuyerBudgetComm, BuyerActComm,CommericalBudget, CommericalAct ,DescBud,DescAct, DebitValueAct,Stockvalue,DirDebitval,
 Dircreditval, FabricBudgetAmt,FabricActAmt,AccBudgetAmt,AccActAmt,PrdnBudgetAmt,PrdnActAmt,OrderQtyWithExcess,ShippedQty,
 TotalOrderQty,CutPcs,OrderQty_ForSET,
ShippedQty_ForSET) VALUES (@Guid,@ExpSalesBud ,@ExpSalesAct ,@ProcessBud ,@ProcessAct ,@DDBBud ,@DDBAct ,@ProdBud ,@ProdAct ,
@SalesCommBud , @SalesCommAct ,@CommBud , @CommAct , @DescBud ,  @DescAct ,@DebitValueAct ,@Stockvalue ,@dirdebval ,@dircreval, 
@FabricBudAmt,@FabricActAmt,@AccBudAmt,@AccActAmt,@PrdnBudAmt,@PrdnActAmt,@OrderQtyWithExcess,@ShippedQty,@OrderQtyWithOutExcess,
@TotalCutPcs,@OrderQty_FORSET ,@ShippedQty_FORSET)    set nocount off