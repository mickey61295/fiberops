/*;=============================================   
; Author           :  Global Software's    
; Create date      :  05/11/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SALES INVOICE
; Change Person    :  ASLAM
; Last Change Date :  06/11/2022 10.57 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_OtherCharge   AS 
BEGIN 

DECLARE @sql1 NVARCHAR(MAX);

SET @sql1 = 'ALTER VIEW Vue_OtherCharge as
 Select AddDedName,Amount,AddDedCode,id ,indexcode From ( 
select Mas_AddDed.AddDedName,Trs_JWrkInvAddded.Amount,Trs_JWrkInvAddded.AddDedCode,Trs_JobWrkInv.ID,Mas_AddDed.indexcode from Trs_JobWrkInv inner join Trs_JWrkInvAddded on Trs_JobWrkInv.id=Trs_JWrkInvAddded.id inner join Mas_AddDed  on Mas_AddDed.AddDedCode=Trs_JWrkInvAddded.AddDedCode        where grp = 5     
union all 
select Mas_AddDed.AddDedName,Trs_SalInvAddded.Amount,Trs_SalInvAddded.AddDedCode,Trs_SalInv.ID,Mas_AddDed.indexcode from Trs_SalInv inner join Trs_SalInvAddded on Trs_SalInv.id=Trs_SalInvAddded.id inner join Mas_AddDed  on Mas_AddDed.AddDedCode=Trs_SalInvAddded.AddDedCode  where grp=1)x'

EXEC sp_executesql @sql1 

END


-- SP_Vue_SalesInvoice  2603