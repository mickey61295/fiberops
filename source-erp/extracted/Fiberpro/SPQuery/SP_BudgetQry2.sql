/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  27/12/2022 10.05 AM 
; =============================================  */  
CREATE PROCEDURE SP_BudgetQry2 (@Ordid int)
AS 
Select OrdID,GrdSlno,StyleNo,WrkID,Pro_Prod_PartwiseRate.PartID,PartName ,isNUll(Rate,0) as Rate,IsNull(JobWrkRate,0) as JobWrkRate,IsNull(AddRate,0) As AddRate,IsNull(JobWrkAddRate,0) as JobWrkAddRate , Case When (Wrkid = -2 OR isnull(Mas_JobWrkComp.Related_Stage,0) = -2) then (Select Avg(IsNull(NoofPcsPerBit,0)) from OrderQtyDtl Where Ordid = Pro_Prod_PartwiseRate.Ordid   and Pro_Prod_PartwiseRate.Styleno = OrderQtyDtl.StyleNo And Pro_Prod_PartwiseRate.PartID  = OrderQtyDtl.PartID  ) Else 0 ENd as NoofPcsPerBit,IsNull(DesignDescription,'') as DesignDescription,'',0,isnull(BitSizeId,0) From Pro_Prod_PartwiseRate INNER JOIN Mas_JobWrkComp ON Pro_Prod_PartwiseRate.WrkId = Mas_JobWrkComp.ID LEFT OUTER JOIN Mas_Part ON Pro_Prod_PartwiseRate.PartID = Mas_Part.PartID Where Ordid=@Ordid  And (WrkID<>-2 and isnull(Mas_JobWrkComp.Related_Stage,0) <> -2 ) ORDER BY GrdSlno