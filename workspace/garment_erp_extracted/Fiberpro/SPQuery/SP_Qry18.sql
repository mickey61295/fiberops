/*;=============================================   
; Author           :  Global Software's    
; Create date      :  20/12/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  08/04/2023 12.05 AM 
; =============================================  */  
CREATE PROCEDURE SP_Qry18
AS
 Update A SET Exs_PerLot = b.Exper FROM Temp_OrderQtySizeClrWise A INNER JOIN (Select Ordid,StyleNo,CmbClrID,LotNo,isNUll(Avg(Exs_Per),0) as Exper FROM OrdQtyClrDtl Group by OrdID,Styleno,LotNo,CmbClrID ) B ON A.OrdId = B.OrdID And A.StyleNo = B.Styleno and A.LotNo = B.LotNo INNER JOIN Mas_Color ON A.ColorDesc = Mas_Color.ColorDesc AND B.CmbClrID = Mas_Color.ColID  