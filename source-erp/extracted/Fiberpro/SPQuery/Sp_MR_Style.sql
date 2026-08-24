/*;=============================================   
; Author           :  Global Software's    
; Create date      :  28/12/2023
; Create By        :  ASLAM 
; Description      :  STYLE DATA UPDATE FOR DASHBOARD
; Change Person    :  ASLAM
; Last Change Date :  04/05/2024 10.15 AM 
; =============================================  */  
  
CREATE PROCEDURE Sp_MR_Style (@OrdId Int,@StyleNo Varchar(20),@StyleQty Numeric(18,3),@CutPlanQty Numeric(18,3),@CutPlanFabric Numeric(18,3),@CutActualFabric Numeric (18,3),@NewFlg Char(1),@EntryFlg Char(2)) As 

DECLARE @BuyerId int,@DelDt Date,@OrderBookDt Date

SELECT @BuyerId = BuyerID FROM ORDERMAS WHERE ORDID = @OrdId
SELECT @DelDt = DelDt FROM OrderMas2 WHERE ORDID = @OrdId 
SELECT @OrderBookDt = BuyordDt FROM OrderMas WHERE ORDID = @OrdId 

If @NewFlg='Y' 
Begin 
Insert Into MR_Style (OrdId,StyleNo,StyleQty,CutPlanQty,BuyerID,DelDt,OrderBookDt) Values (@OrdId,@StyleNo,@StyleQty,@CutPlanQty,@BuyerId,@DelDt,@OrderBookDt) 
End 
Else 
If @EntryFlg='OR' 
Begin 
Update MR_Style Set StyleQty=@StyleQty,CutPlanQty=@CutPlanQty Where OrdId=@OrdId And StyleNo=@StyleNo 
End 
Else 
If @EntryFlg='PR' 
Begin 
Update MR_Style Set CutPlanFabric=@CutPlanFabric Where OrdId=@OrdId And StyleNo=@StyleNo 
End 
Else 
If @EntryFlg='DE' 
Begin 
Update MR_Style Set CutActualFabric=CutActualFabric+@CutActualFabric Where OrdId=@OrdId And StyleNo=@StyleNo 
End 

Update MR_Style Set BuyerID = @BuyerID , DelDt=@DelDt ,OrderBookDt = @OrderBookDt Where OrdId=@OrdId And StyleNo=@StyleNo 
SET NOCOUNT OFF;
  
  
  
  
  
  
  
