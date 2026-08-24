/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  03/12/2022 10.00 AM 
; =============================================  */  
CREATE PROCEDURE SP_SizeList (@Ordid int,@StyleNo Varchar(30),@BitSizeId int) AS

SELECT DISTINCT Mas_Size.SizeDesc, OrdSizeMas.SNo FROM ORderMas INNER JOIN OrderQtyDtl ON OrderMas.Ordid = OrderQtyDtl.Ordid  INNER JOIN OrdSizeMas ON OrderMas.OrdID = OrdSizeMas.OrdID AND OrderQtyDtl.Styleno = OrdSizeMas.StyleNo AND OrderQtyDtl.SizeID = OrdSizeMas.SizeID INNER JOIN Mas_Size ON OrdSizeMas.SizeID = Mas_Size.SizeID inner join Pro_ProdBitCutDet C ON  OrderQtyDtl.OrdID = c.Ordid and OrderQtyDtl.StyleNo = C.Styleno and OrderQtyDtl.SizeID = c.SizeId WHERE  OrdSizeMas.OrdID =@Ordid And OrderQtyDtl.Styleno =@StyleNo and C.BitSizeID = @BitSizeId  UNION SELECT DISTINCT Mas_Size.SizeDesc,999  FROM Mas_Size WHERE SizeID=-2  ORDER BY OrdSizeMas.SNo