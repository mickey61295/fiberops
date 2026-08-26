/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in MR_ProcessDetails
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_MR_ProcessDetails_Update    ON  MR_ProcessDetails AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20), @DeptID INT,@DesignID INT,@ColID int

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		SELECt @DeptID = DeptID FROM INSERTED 
		SELECt @DesignID = designId FROM INSERTED 
		SELECt @ColId = ColID FROM INSERTED 

        Update MR_ProcessDetails SET UpdateFlg = 1 Where OrdID=@Ordid And Styleno = @Styleno And DeptId = @DeptID And  ColID = @ColID and designId = @DesignID
    END
END