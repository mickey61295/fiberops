/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for Actual Entry UpdateFlg in WBS_PRoduction
; Change Person  :  ASLAM          
; Last Change Date :  23/Jun/2025 10.00 AM            
; =============================================   */     
CREATE TRIGGER [dbo].[Trg_WBS_Production_Update_Actual]    ON  [dbo].[WBS_PRODUCTION] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@DeptID INT,@Styleno Varchar(30),@StageID int,@PartId int 

  
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @DeptID = DeptID FROM INSERTED
		SELECT @Styleno = StyleNo FROM INSERTED
		SELECT @StageID = StageID FROM INSERTED
        SELECT @PartID = PartID FROM INSERTED
		
		
		if update(ActualStart) or update(ActualFinish)
		begin
			
				Update WBS_Production SET ActualPosting_UpdateFlg = 1 Where OrdID=@Ordid And StyleNo  = @Styleno  And DeptID = @DeptId AND stageid = @StageID And PartId = @PartID 
			
			
		end
        
    
END