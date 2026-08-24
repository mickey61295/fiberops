/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  01/06/2023 10.00 AM 

; =============================================  */  

  

CREATE PROCEDURE Sp_Panel2 (@Id Int,@ColId Int,@StyleId Int,@StyleNo VarChar(20),@PartID Int,@SizId Int,@LotNo Varchar(15),@PoNo Varchar(15),@Rate Numeric(18,2),@Qty Int,@Process Varchar(50),@SourceStageId Int,@CompId int) As  

Begin   



    

IF (@Process <> 'Despatch' and @Process <> 'Sales')    

BEGIN    

If (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID AND SourceStageId=@SourceStageId and LotNo=@LotNo and IsNull(CompId,0) = @CompId )=0 And @Qty>0    

BEGIN     

INSERT INTO TRS_Pcs2 (ID, ColID, StyleID, PanelId, SizeID, Pcs, StyleNo, Rate, PartID,LotNo,PoNo,SourceStageId,CompId) VALUES  (@ID,  @ColId,       @StyleId, 0, @SizId, @Qty, @StyleNo, @Rate, @PartID,@LotNo,'',@SourceStageId,@CompId)       

Exec PROC_Stock_PanelDelivery_Insert @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo,@CompId     

END  

ELSE	  

IF (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And   ColId = @ColId And PartId = @PartID and SourceStageId=@SourceStageId and LotNo=@LotNo and IsNull(CompId,0) = @CompId )>0 And @Qty>0 	      

BEGIN	       

EXEC PROC_Stock_PanelDelivery_Update @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo  ,@CompId        

UPDATE Trs_Pcs2 set Pcs = @Qty, Rate = @Rate Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID And SourceStageId=@SourceStageId	and LotNo=@LotNo   and IsNull(CompId,0) = @CompId

   END      

   ELSE     

   BEGIN       

   EXEC PROC_Stock_DeliveryPanel_Delete_1 @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo,@CompID       

   DELETE FROM TRS_PCS2 WHERE ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID And SourceStageId=@SourceStageId and LotNo=@LotNo     and IsNull(CompId,0) = @CompId

   END     

   END      

   END 


