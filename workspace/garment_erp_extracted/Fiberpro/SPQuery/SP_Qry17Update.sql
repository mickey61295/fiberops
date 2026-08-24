/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  14/03/2023 10.00 AM 
; =============================================  */  

 CREATE PROCEDURE SP_Qry17Update (@ID int) AS
BEGIN

 Update A set ShadeNo = isnull(b.shadeNo,'') From Trs_po5 A left join ShadeEntry  B ON A.Ordid = B.OrdId and A.Styleno = B.Styleno and A.AType = b.AccTypeid
 and A.Ades = B.AccDescID and A.Clr = B.ColId WHERE b.DeptId = 16 and a.id = @ID

END
