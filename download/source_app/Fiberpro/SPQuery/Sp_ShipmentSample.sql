/*;=============================================   
; Author           :  Global Software's    
; Create date      :  21/03/2025  
; Create By        :  M.SUGANYA   
; Description      :  Piece Delivery
; Change Person    :  M.SUGANYA 
; Last Change Date :  21/03/2025 10.20 AM 
; =============================================  */ 
 CREATE PROCEDURE Sp_ShipmentSample (@Id Int,@ColId Int,@StyleId Int,@StyleNo VarChar(20),@PartID Int,@SizId Int,@LotNo Varchar(15),@PoNo Varchar(15),@Rate Numeric(18,2),@Qty Int,@Process Varchar(50),@SourceStageId Int,@compID Int) As  
Begin   

 IF (@Process = 'ShipmentSample')    
 BEGIN    
 If (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID AND SourceStageId=@SourceStageId and LotNo=@LotNo )=0 And @Qty>0    
 BEGIN     
 INSERT INTO TRS_Pcs2 (ID, ColID, StyleID, PanelId, SizeID, Pcs, StyleNo, Rate, PartID,LotNo,PoNo,SourceStageId,CompID) VALUES  (@ID,
  @ColId,       @StyleId, 0, @SizId, @Qty, @StyleNo, @Rate, @PartID,@LotNo,'',@SourceStageId,0)     
     
  END   
  ELSE	   
  IF (Select Count(Id) From Trs_Pcs2 Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And   ColId = @ColId And PartId = @PartID and SourceStageId=@SourceStageId and LotNo=@LotNo)>0 And @Qty>0 	       
  BEGIN	        
 
   UPDATE Trs_Pcs2 set Pcs = @Qty, Rate = @Rate Where ID = @ID And SizeID = @SizID And StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID 
  And SourceStageId=@SourceStageId	and LotNo=@LotNo      
  END         
  ELSE        
  BEGIN          
  
  DELETE FROM TRS_PCS2 WHERE ID = @ID And SizeID = @SizID And
 StyleNo=@Styleno And StyleId = @StyleId And ColId = @ColId And PartId = @PartID And SourceStageId=@SourceStageId and LotNo=@LotNo     END     END      END 