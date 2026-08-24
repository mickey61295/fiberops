/*;=============================================   
; Author           :  Global Software's    
; Create date      :  19/01/2023    
; Create By        :  ASLAM  
; Description      :  Piece Delivery
; Change Person    :  ASLAM
; Last Change Date :  09/01/2023 10.20 AM 
; =============================================  */ 
 CREATE PROCEDURE Sp_Pcs2 (@Id Int,@ColId Int,@StyleId Int,@StyleNo VarChar(20),@PartID Int,@SizId Int,@LotNo Varchar(15),@PoNo Varchar(15),@Rate Numeric(18,2),@Qty Int,@Process Varchar(50),@SourceStageId Int,@compID Int) As  
Begin   
IF (@Process ='Despatch' or @Process ='Sales')  
BEGIN 	
If (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And @StyleId = @StyleId And ColId = @ColId And PartId = @PartID And LotNo=@LotNo And PONo = @PoNo and SourceStageId=@SourceStageId)=0 And @Qty>0   	
BEGIN   		
INSERT INTO TRS_Pcs2 (ID, ColID, StyleID, PanelId, SizeID, Pcs, StyleNo, Rate, PartID, LotNo, PoNo,SourceStageId,compID) VALUES  (@ID,  @ColId,       @StyleId, 0, @SizId, @Qty, @StyleNo, @Rate, @PartID, @LotNo, @PoNo,@SourceStageId,0)   		
if @Process <>'Sales'
BEGIN
Exec PROC_Stock_PiecesDelivery_Insert @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo   	
END

END   	

IF (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And       ColId = @ColId And PartId = @PartID And LotNo=@LotNo And PONo = @PoNo And SourceStageId=@SourceStageId)>0 And @Qty>0 	 	
BEGIN	       		
if @Process <>'Sales'
BEGIN
EXEC PROC_Stock_PiecesDelivery_Update @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo  		
END
UPDATE Trs_Pcs2 set Pcs = @Qty, Rate = @Rate Where ID = @ID And SizeID =		 @SizID And StyleNo=@Styleno And StyleId =	@StyleId And ColId = @ColId And PartId = @PartID And LotNo=@LotNo And PONo = @PoNo  And  SourceStageId=@SourceStageId   	 
END    	 
ELSE    	 
BEGIN     		
if @Process <>'Sales'
BEGIN
 EXEC PROC_Stock_DeliveryPieces_Delete_1 @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo  		 
END
 DELETE FROM TRS_PCS2 WHERE ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID And LotNo=@LotNo And PONo = @PoNo And SourceStageId=@SourceStageId    	 
 END 
 END     
 IF (@Process <> 'Despatch' and @Process <> 'Sales')    
 BEGIN    
 If (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID AND SourceStageId=@SourceStageId and LotNo=@LotNo )=0 And @Qty>0    
 BEGIN     
 INSERT INTO TRS_Pcs2 (ID, ColID, StyleID, PanelId, SizeID, Pcs, StyleNo, Rate, PartID,LotNo,PoNo,SourceStageId,CompID) VALUES  (@ID,
  @ColId,       @StyleId, 0, @SizId, @Qty, @StyleNo, @Rate, @PartID,@LotNo,'',@SourceStageId,0)        
  Exec PROC_Stock_PiecesDelivery_Insert @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo      
  END   
  ELSE	   
  IF (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And   ColId = @ColId And PartId = @PartID and SourceStageId=@SourceStageId and LotNo=@LotNo)>0 And @Qty>0 	       
  BEGIN	        
  EXEC PROC_Stock_PiecesDelivery_Update @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo           
  UPDATE Trs_Pcs2 set Pcs = @Qty, Rate = @Rate Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID 
  And SourceStageId=@SourceStageId	and LotNo=@LotNo      
  END         
  ELSE        
  BEGIN          
  EXEC PROC_Stock_DeliveryPieces_Delete_1 @Id,@Styleno ,@PartId ,@ColId ,@SizId ,@SourceStageID ,@Qty ,@LotNo          
  DELETE FROM TRS_PCS2 WHERE ID = @ID And SizeID = @SizID And
 StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID And SourceStageId=@SourceStageId and LotNo=@LotNo     END     END      END 