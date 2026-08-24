/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Acc.Party Balance 
; Change Person  :  ASLAM          
; Last Change Date :  04/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_Acc_PartyBal_Abs_Update    ON  ST_Acc_PartyBal_Abs AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@STYLENO VARCHAR(20), @DeptId INT,@PartyId INT,@ID int

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @STYLENO = STYLENO FROM INSERTED
		SELECt @DeptId = DeptID FROM INSERTED 
		SELECt @PartyId = PartyID FROM INSERTED 
		SELECt @Id = ID FROM INSERTED 

        Update ST_Acc_PartyBal_Abs SET UpdateFlg = 1 Where OrdID=@Ordid And Styleno = @Styleno And DeptId = @DeptId And PartyID = @PartyID and ID = @ID
    END
END