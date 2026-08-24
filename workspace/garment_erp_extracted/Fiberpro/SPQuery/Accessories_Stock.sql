/*;=============================================   
; Author           :  Global Software's    
; Create date      :  20/08/2015    
; Create By        :  Karthick.M  
; Description      :  Accessories_Stock  
; Change Person    :  S.Nasima
; Last Change Date :  31/01/2019 10.45 AM 
; =============================================  */  
  
CREATE PROCEDURE [dbo].[Accessories_Stock]   
@Ordid int,  
@ItemType Int  
AS  
BEGIN 
SET NOCOUNT ON;  
 Select D.ACCDESCRIPTION , E.ColorDesc As "COLOR DESCRIPTION",SIZE = F.SizeDesc,U.UOM,SUM(A.Kg) As QTY,GODOWN = G.GodName  
   From Currentstock A   
   INNER JOIN StockTable B ON A.StockID = B.StockID   
   INNER JOIN Mas_Exporter ME ON ME.ExpID = B.Coycode   
   INNER JOIN Mas_Acc C ON C.Id = b.Atype INNER JOIN Mas_AccDes D ON D.ID = B.ADes  
   LEFT OUTER JOIN Mas_Color E ON E.ColID = B.ColID   
   INNER JOIN Mas_Uom U ON U.UomID = C.UomId   
   INNER JOIN Mas_Godown G ON G.GodID = A.GodID   
   LEFT OUTER JOIN Mas_Size F ON F.SizeID = B.Siz  
   Where B.YF='A' and a.ordid = @Ordid and b.Atype= @ItemType and A.Kg > 0   
   group by G.GodName,D.AccDescription, E.ColorDesc,F.SizeDesc,U.Uom  
   Order by G.GodName  
 

 SET NOCOUNT OFF;  
END  
  
  
  
  
  
  
  
  
