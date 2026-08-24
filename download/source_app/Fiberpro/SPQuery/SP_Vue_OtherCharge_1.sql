/*;=============================================   
; Author           :  Global Software's    
; Create date      :  05/11/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SALES INVOICE
; Change Person    :  ASLAM
; Last Change Date :  06/11/2022 10.00 AM 
; =============================================  */  
CREATE PROCEDURE SP_Vue_OtherCharge_1 AS 
BEGIN 

DECLARE @sql1 NVARCHAR(MAX);

SET @sql1 = 'ALTER VIEW Vue_OtherCharge as
 Select AddDedName,Amount,AddDedCode,id ,indexcode From ( 
select Mas_AddDed.AddDedName,Trs_SalInvAddded.Amount,Trs_SalInvAddded.AddDedCode,Trs_SalInv.ID,Mas_AddDed.indexcode from Trs_SalInv inner join Trs_SalInvAddded on Trs_SalInv.id=Trs_SalInvAddded.id inner join Mas_AddDed  on Mas_AddDed.AddDedCode=Trs_SalInvAddded.AddDedCode  where grp=1)X'

EXEC sp_executesql @sql1 

END


-- SP_Vue_SalesInvoice  2603