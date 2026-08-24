/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  29/09/2022 10.05 AM 
; =============================================  */  
CREATE PROCEDURE PartyOutQry (@OrdId int,@DeptID Int,@PartyID int)
AS
Select X.StyleNo,x.Dept,sum(DelKgs-RetKgs) as Dckgs,isnull(Sum(isnull(CumulateRate,0) + isnull(FabricValue,0) + isnull(OvrAllAccValue_ForPcs,0)),
 0) as budrate,isnull(sum(DelKgs-RetKgs)*Sum(isnull(CumulateRate,0) + isnull(FabricValue,0) + isnull(OvrAllAccValue_ForPcs,0)) ,0) 
  as Amt from ( select Del.Ordjobno as Ordid,TargetStageID as Dept, StyleNo,sum(Pcs) as DelKgs,0 as RetKgs from trs_pcs1 Del 
  inner join trs_pcs2 DelDtl(nolock) on Del.id=Deldtl.id where DelType='Process' and Del.Ordjobno=@Ordid  and dept= @DeptID  and party=@PartyID
  group by  Del.Ordjobno,dept, StyleNo ,TargetStageID UNION ALL Select grn.OrdJob,TargetStageID as Dept, StyleNo,0 as DelKgs,sum(Recpcs) as RetKgs from Trs_PcsGrn1 grn inner join Trs_PcsGrn2 grnDtl(nolock) on grn.id=grnDtl.id where grntype='Process Receipt' and grn.OrdJob=@Ordid  And grn.dept = @DeptID  and Party=@PartyID group by grn.OrdJob,Dept, StyleNo,TargetStageID) x left outer join PcsStockRatePost stkrate(nolock) on  x.ordid=stkrate.ordid and x.dept = stkrate.deptid   and x.StyleNo = stkrate.styleno  group by X.Styleno,x.Dept 

