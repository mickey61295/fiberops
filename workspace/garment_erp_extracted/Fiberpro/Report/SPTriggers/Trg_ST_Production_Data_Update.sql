/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in ST PRODUCTION DATA (PRd.details) Master
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_Production_Data_Update    ON  ST_Production_Data AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20), @StageId INT,@PartId INT,@ColID int,@SizeID int,@coycode int

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @Coycode = Coycode FROM INSERTED
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		SELECt @StageId = StageId FROM INSERTED 
		SELECt @PartId = PartID FROM INSERTED 
		SELECt @ColId = ColID FROM INSERTED 
		SELECt @SizeID = SizeID FROM INSERTED 

        Update ST_Production_Data SET UpdateFlg = 1 Where Coycode = @Coycode and OrdID=@Ordid And Styleno = @Styleno And StageId = @StageId And PartID = @PartID and ColID = @ColID and SizeID = @SizeID 
    END
END