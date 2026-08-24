/*;=============================================   
; Author           :  Global Software's    
; Create date      :  15/09/2023    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  15/09/2023 10.10 AM 
; =============================================  */  
CREATE PROCEDURE SP_Qry36 (@Ordid int,@StyleNo Varchar(30),@Pcs int,@Coycode Int,@LotID Int,@StageID Int,@GodID Int,@ColId Int,@SizeId Int,
@PcsStockId Int,@OldPcs int) AS
BEGIN

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty =  IsNull(Pcs_StockTableQty.StockQty,0) +  (Pcs - OldPcs) From Pcs_StockTableQty 
Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Coycode and Ordid=@Ordid and StyleNo=@StyleNo 
and LotID = @LotID and Stageid=@StageID and GodId=@GodID and PartyId=0 and Pcs_StockTableQty.ColId=@colId and Pcs_StockTableQty.SizeId=@SizeID 
and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0  And Pcs_StockTable.PcsStockid = @PcsStockid

END
