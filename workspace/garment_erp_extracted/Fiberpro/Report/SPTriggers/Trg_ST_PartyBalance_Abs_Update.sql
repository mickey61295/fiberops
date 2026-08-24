/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  04/Nov/2019            
; Create By  :  ASLAM            
; Description  :  Trigger for UpdateFlg in Party Balance Fabric Master
; Change Person  :  ASLAM          
; Last Change Date :  06/Nov/2019 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_ST_PartyBalance_Abs_Update    ON  ST_PartyBalance_Abs AFTER UPDATE AS 
BEGIN
    SET NOCOUNT ON;
    DECLARE @Ordid INT,@DeptID INT,@PartyID INT,@ID INT

    IF not (update(server_id) OR update (UpdateFlg) )
    BEGIN
		SELECT @OrdID = OrdID FROM INSERTED
		SELECT @DeptID = DeptID FROM INSERTED
		SELECT @PartyID = PARTYID FROM INSERTED
		SELECT @ID = ID FROM INSERTED

        Update ST_PartyBalance_Abs SET UpdateFlg = 1 Where OrdID=@Ordid And DeptID = @DeptId And PartyId = @PartyID And ID 
= @ID 
    END
END