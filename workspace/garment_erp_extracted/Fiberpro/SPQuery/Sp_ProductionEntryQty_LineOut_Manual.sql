/*;=============================================   
; Author           :  Global Software's    
; Create date      :  07/11/2025    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  20/11/2025 09.00 AM 
; =============================================  */  
CREATE PROCEDURE Sp_ProductionEntryQty_LineOut_Manual (@Id Int,@SizId Int,@Qty Int)  As  
Begin   
DECLARE @StageId Int , @Rework Int ,@SplOperation char(1)  ,@LineOutManual Char(1)
SELECT @StageId  = STAGEID FROM Trs_Prodentry WHERE ID = @ID  
SELECT @Rework = Rework FROM Trs_Prodentry WHERE ID = @Id  
SELECT @SplOperation = IsNull(Spl_Operation,'N') FROM Mas_JobWrkComp WHERE ID = @StageId  
SELECT @LineOutManual = 'Y' 

If (Select Count(Id) From Trs_ProdEntryQty Where  ID = @ID And SizID = @SizID)=0 And @Qty>0   
BegiN      
PRINT 'HI-0'
Insert Into Trs_ProdEntryQty (Id,SizId,ProdPcs) Values (@Id,@SizId,@Qty)   
	IF @LineOutManual = 'Y' AND @StageId <>1  AND (@Rework <> 1) 
		BEGIN 	
			IF @SplOperation ='N'          	
				BEGIN 		
					--Exec PROC_Stock_ProdPieces_IssueToPrdn @ID,@SizID,@Qty  
					Exec PROC_Stock_ProdPieces_LineOut @ID,@SizID,@Qty  
					Update Trs_ProdEntry Set StockPostingFlg = 'Y' Where Id=@Id      
				END  
		END   
		ELSE  
			BEGIN  
				IF @SplOperation ='N'          
					BEGIN 	
						Update Trs_ProdEntry Set StockPostingFlg = 'Y'  Where Id=@Id      
					END 
			END   
EnD      
ELSE    
	BEGIN    
		IF (Select Count(Id) From Trs_ProdEntryQty Where ID = @ID And SizID = @SizID)>0 And @Qty>0         
			BegiN       
				IF @LineOutManual = 'Y' AND @StageId <>1 AND (@Rework <> 1)    
				BEGIN  
				PRINT 'HI-1'
					IF @SplOperation ='N'          
						BEGIN  
						PRINT 'HI-2'
							--Exec PROC_Stock_ProdPieces_Update_IssueToPrdn @ID,@SizID,@Qty      
							Exec PROC_Stock_ProdPieces_Update @ID,@SizID,@Qty      
						END 
						Update Trs_ProdEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId     
				END   
				ELSE     
					BEGIN  
						IF @SplOperation ='N'          
							BEGIN  
								Update Trs_ProdEntry Set StockPostingFlg = 'Y'  Where Id=@Id      
							END  
							Update Trs_ProdEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId    
					END       
			EnD       
			Else        
				BegiN  	   
					IF @LineOutManual = 'Y' AND @StageId <>1  AND (@Rework <> 1) 	   
					BEGIN  
						IF @SplOperation ='N'          
							BEGIN 
								Exec PROC_Stock_ProdPieces_Delete_IssueToPrdn @Id,@SizId,0   	   
							END   
								Delete From Trs_ProdEntryQty Where Id=@Id And SizId=@SizId     	   
					END  	  
					ELSE  	  
						BEGIN  	  
							IF @SplOperation ='N'  
							BEGIN  
								Update Trs_ProdEntry Set StockPostingFlg = 'Y'  Where Id=@Id      
							END 
								Delete From Trs_ProdEntryQty Where Id=@Id And SizId=@SizId    	   
						END     
				EnD    
			END    
EnD 