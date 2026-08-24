/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  27/12/2022 10.05 AM 
; =============================================  */  
CREATE PROCEDURE SP_BudgetQry1 (@Ordid int)
AS 
 Select OrdID,GrdSlno,StyleNo,IsNull(Wrk_ID,2) As WrkID,Pro_Prod_BitCutRate.PartID,PartName ,isnull(Rate,0) as Rate ,IsNull(JobWrkRate,0) as JobWrkRate,IsNull(AddRate,0) As AddRate,IsNull(JobWrkAddRate,0) as JobWrkAddRate , IsNull(NoofPcsPer_Bit,0)  as NoofPcsPerBit,IsNull(DesignDescription,'') as DesignDescription,isnull(BitDesc,''),IsNull(PcsWt,0),isnull(BitSizeId,0)  From Pro_Prod_BitCutRate  LEFT OUTER JOIN Mas_Part ON Pro_Prod_BitCutRate.PartID = Mas_Part.PartID Where Ordid=@ORdid  ORDER BY GrdSlno