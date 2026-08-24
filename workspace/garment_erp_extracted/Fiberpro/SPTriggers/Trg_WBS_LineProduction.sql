
/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in WBS_LineProduction (FOR COMMANDO LINE PLANNING) Master
; Change Person  :  ASLAM          
; Last Change Date :  29/Nov/2024 10.00 AM            
; =============================================   */     
CREATE TRIGGER [dbo].[Trg_WBS_LineProduction]    ON  [dbo].[WBS_LineProduction] AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20), @StageId INT,@PartId INT,@ColID int,@SizeID int,@coycode int,@LineId int,@Dt DateTime

    IF not (update(serverid) OR update (UpdateFlg) )
    BEGIN
		SELECT @Coycode = Coycode FROM INSERTED
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		SELECt @PartId = PartID FROM INSERTED 
		SELECt @ColId = ColID FROM INSERTED 
		SELECt @SizeID = SizeID FROM INSERTED 
		SELECt @LineId = SizeID FROM INSERTED 
		SELECt @Dt = Dt FROM INSERTED 

        Update WBS_LineProduction SET UpdateFlg = 1 Where Coycode = @Coycode and OrdID=@Ordid And Styleno = @Styleno And LineID = @LineId And PartID = @PartID and ColID = @ColID and SizeID = @SizeID  and Dt=@Dt
    END
END
GO
