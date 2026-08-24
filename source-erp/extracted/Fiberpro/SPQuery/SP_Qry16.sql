/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  14/03/2023 10.00 AM 
; =============================================  */  

 CREATE PROCEDURE SP_Qry16 (@Ordid int,@Coycode INT) AS
BEGIN

 SELECT FabId from Trs_Po1 INNER JOIN Trs_PO3 ON Trs_Po1.ID = Trs_Po3.ID Where Trs_Po3.OrdID=@Ordid and Trs_Po1.Coycode= @Coycode
       UNION SELECT FabId from Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN StockTable ON Trs_Del2.StockId = StockTable.StockID Where Trs_Del2.OrdID= @Ordid and Trs_Del1.Coycode=@Coycode
         UNION SELECT FabType as FabID from Trs_Del1 INNER JOIN Trs_Del3 ON Trs_Del1.ID = Trs_Del3.ID Where Trs_Del3.OrdID= @Ordid  and Trs_Del1.Coycode=@Coycode
         UNION SELECT FabID from Trs_Del1 INNER JOIN Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN StockTable ON Trs_Del2.StockId = StockTable.StockID Where Trs_Del2.TranOrdID=@ORdid and Trs_Del1.Coycode=@Coycode
         UNION SELECT FabID from Trs_Opening INNER JOIN StockTable ON Trs_Opening.StockId = StockTable.StockID Where Trs_Opening.OrdID=@Ordid and Trs_Opening.Coycode=@Coycode
END
