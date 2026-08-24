/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  17/08/2022 10.00 AM 
; =============================================  */  

CREATE PROCEDURE Sp_ProductionEntryQty_Panel_ASM (@Id Int,@SizId Int,@Qty Int,@compId int,@oldPcs int)  As  
Begin   

If (Select Count(Id) From Trs_AddPanelEntryQty Where  ID = @ID And SizID = @SizID)=0 And @Qty>0  
Begin    
Insert Into Trs_AddPanelEntryQty (Id,SizId,ProdPcs) Values (@Id,@SizId,@Qty)  
Exec PROC_Stock_ProdPanel_Asm @ID,@SizID,@Qty,@compId  
Update Trs_AddPanelEntry Set StockPostingFlg = 'Y' Where Id=@Id 
End   
ELSE   
BEGIN   
IF (Select Count(Id) From Trs_AddPanelEntryQty Where ID = @ID And SizID = @SizID)>0 And @Qty>0  
Begin   
Exec PROC_Stock_ProdPanel_Update_ASM @ID,@SizID,@Qty,@CompID,@OldPcs  
Update Trs_AddPanelEntryQty Set SizId = @SizId ,ProdPcs = @Qty Where Id=@Id And SizId = @SizId   
End  
Else    
Begin  	 
/*Exec PROC_Stock_ProdPanel_Delete @Id,@SizId,0 */
Exec PROC_Stock_ProdPanel_Update_ASM @ID,@SizID,@Qty,@CompID,@OldPcs  
Delete From Trs_AddPanelEntryQty Where Id=@Id And SizId=@SizId    
End   
END  
End 