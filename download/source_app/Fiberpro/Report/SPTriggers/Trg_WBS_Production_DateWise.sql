/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in WBS_Production_DateWise (PRd.details) Master
; Change Person  :  ASLAM          
; Last Change Date : 21/Decv/2023 10.00 AM            
; =============================================   */     
CREATE TRIGGER [dbo].[Trg_WBS_Production_DateWise]    ON  [dbo].[WBS_Production_DateWise] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20), @StageId INT,@PartId INT,@DeptID int,@Dt DateTime,@coycode int,@LineId int

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @Coycode = Coycode FROM INSERTED
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		SELECt @StageId = StageId FROM INSERTED 
		SELECt @PartId = PartID FROM INSERTED 
		SELECt @DeptID = DeptID FROM INSERTED 
		SELECt @Dt = ProdDate FROM INSERTED 
		SELECt @LineID = IsNull(LineID,0) FROM INSERTED 

        Update WBS_Production_DateWise SET UpdateFlg = 1 Where Coycode = @Coycode and OrdID=@Ordid And Styleno = @Styleno And StageId = @StageId And PartID = @PartID and ProdDate = @Dt And DeptID = @deptID And IsNull(LineID,0) = @LineID
    END
END
GO


